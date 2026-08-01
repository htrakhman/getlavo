import { NextResponse } from 'next/server';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendAdminNotification, sendContractOffer } from '@/lib/email/resend';
import { gatherContractPdfData, renderContractPdf } from '@/lib/contract-pdf';
import { resolveGoverningLaw } from '@/lib/governing-law';
import { operatorRequirements } from '@/lib/operator-readiness';
import { z } from 'zod';

const Body = z.object({
  buildingId: z.string().uuid(),
});

/**
 * Operator sends a service agreement to a building. The building manager is
 * emailed (at their signup address) asking whether they'd like this crew as
 * their washer; the contract shows up on both parties' agreement pages for
 * signing.
 */
export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session || !session.portals.includes('operator')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = Body.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const { buildingId } = body.data;

  const sb = supabaseServer();
  const admin = supabaseAdmin();

  const { data: operator } = await sb
    .from('operators')
    .select('id, name, owner_id, status, base_price_cents, hours_json')
    .eq('owner_id', session.user.id)
    .maybeSingle();
  if (!operator) return NextResponse.json({ error: 'Operator not found' }, { status: 404 });
  if (operator.status !== 'approved') {
    return NextResponse.json({ error: 'Your operator profile must be approved first' }, { status: 403 });
  }

  // Required-field gate: the agreement can't be sent until the profile has the
  // fields the document needs. Shares operatorRequirements with the marketplace
  // gate and the operator's own checklist, so the three can't drift apart.
  const { count: packageCount } = await sb
    .from('service_packages')
    .select('*', { count: 'exact', head: true })
    .eq('operator_id', operator.id)
    .eq('active', true);
  const missing = operatorRequirements(operator, packageCount ?? 0)
    .filter((r) => !r.done && ['name', 'schedule', 'price', 'packages'].includes(r.key))
    .map((r) => r.label.charAt(0).toUpperCase() + r.label.slice(1));
  if (missing.length) {
    return NextResponse.json(
      { error: `Complete your agreement before sending: ${missing.join(', ')}` },
      { status: 400 },
    );
  }

  const { data: building } = await admin
    .from('buildings')
    .select('id, name, manager_id, status, region, wash_day, preferred_wash_day')
    .eq('id', buildingId)
    .in('status', ['prospect', 'pilot', 'active'])
    .single();
  if (!building) return NextResponse.json({ error: 'Building not found' }, { status: 404 });

  const { data: existing } = await admin
    .from('contracts')
    .select('id, status')
    .eq('building_id', buildingId)
    .eq('operator_id', operator.id)
    .in('status', ['draft', 'pending_signatures', 'executed']);
  if (existing?.length) {
    return NextResponse.json({ error: 'You already have an agreement with this building' }, { status: 409 });
  }

  // Same shape the building-side auto-create writes, so an agreement means the
  // same thing whichever side started it. Without governing_law the column
  // default ("Delaware") stood in for the building's real state.
  const { data: contract, error } = await admin
    .from('contracts')
    .insert({
      building_id: buildingId,
      operator_id: operator.id,
      status: 'pending_signatures',
      service_day: building.wash_day || building.preferred_wash_day || null,
      governing_law: resolveGoverningLaw(building.region),
      price_per_wash_cents: operator.base_price_cents,
    })
    .select('id')
    .single();
  if (error || !contract) {
    return NextResponse.json({ error: error?.message ?? 'Failed to create agreement' }, { status: 500 });
  }

  if (building.manager_id) {
    const { data: managerProfile } = await admin
      .from('profiles')
      .select('email, full_name')
      .eq('id', building.manager_id)
      .single();
    if (managerProfile?.email) {
      // Generate the agreement PDF so it can ride along on the offer email.
      // A rendering failure must not block the offer, so it's best-effort.
      let pdfBytes: Uint8Array | null = null;
      try {
        const data = await gatherContractPdfData(admin, contract.id);
        if (data) pdfBytes = await renderContractPdf(data);
      } catch (e) {
        console.error('contract offer: pdf generation failed:', e);
      }
      await sendContractOffer({
        to: managerProfile.email,
        managerName: managerProfile.full_name ?? 'there',
        buildingName: building.name,
        operatorName: operator.name,
        pdfBytes,
      }).catch(() => {});
    }
  }

  await sendAdminNotification({
    subject: `Contract offer: ${operator.name} → ${building.name}`,
    lines: [
      `Operator ${operator.name} (${session.profile.email}) sent a service agreement to ${building.name}.`,
      `Contract ID: ${contract.id}`,
    ],
    replyTo: session.profile.email || undefined,
  }).catch(() => {});

  return NextResponse.json({ contractId: contract.id });
}
