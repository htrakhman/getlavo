import { NextResponse } from 'next/server';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendAdminNotification, sendPartnershipRequest } from '@/lib/email/resend';
import { operatorSetup, pendingLabel } from '@/lib/operator-readiness';
import { parseDateList, futureDates } from '@/lib/wash-dates';
import { z } from 'zod';

const Body = z.object({
  buildingId: z.string().uuid(),
  operatorId: z.string().uuid(),
});

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session || !session.portals.includes('building')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = Body.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const { buildingId, operatorId } = body.data;

  const sb = supabaseServer();
  const admin = supabaseAdmin();

  // Verify the building belongs to this manager
  const { data: building } = await sb
    .from('buildings')
    .select('id, name, manager_id, address_line1, city, region, total_units, wash_day, preferred_wash_day, requested_wash_dates')
    .eq('id', buildingId)
    .eq('manager_id', session.user.id)
    .single();
  if (!building) return NextResponse.json({ error: 'Building not found' }, { status: 404 });

  // Check no active or pending partnership already exists for this building.
  // Admin read: the blocking row can belong to a crew this manager can't see
  // under RLS, and the message below has to name them — an unattributed
  // "a request is already pending" on some other crew's page reads like a bug.
  const { data: existing } = await admin
    .from('partnerships')
    .select('id, status, operator_id, operator:operators(name)')
    .eq('building_id', buildingId)
    .in('status', ['active', 'pending'])
    .maybeSingle();
  if (existing) {
    const blockingName = (existing.operator as any)?.name ?? 'another crew';
    const sameOperator = existing.operator_id === operatorId;
    const error =
      existing.status === 'active'
        ? sameOperator
          ? `${blockingName} is already your active partner for ${building.name}.`
          : `${building.name} already has an active partner (${blockingName}). End that partnership before requesting another crew.`
        : sameOperator
          ? `You've already requested ${blockingName} — waiting on them to accept.`
          : `${building.name} already has a pending request with ${blockingName}. They need to accept or decline it before you can request another crew.`;
    return NextResponse.json({ error }, { status: 409 });
  }

  // Fetch operator and owner email. Every signed-up operator is listed in the
  // marketplace, so "not ready" is a distinct, explainable answer rather than a
  // 404 — the UI disables the button, this backs it up with the same checklist.
  const { data: operator } = await admin
    .from('operators')
    .select('id, name, owner_id, status, stripe_onboarding_complete, hours_json, base_price_cents, insurance_doc_url, profiles:profiles!operators_owner_id_fkey(email, full_name)')
    .eq('id', operatorId)
    .in('status', ['approved', 'pending_review'])
    .single();
  if (!operator) return NextResponse.json({ error: 'Operator not found or not available' }, { status: 404 });

  const { count: activePackages } = await admin
    .from('service_packages')
    .select('*', { count: 'exact', head: true })
    .eq('operator_id', operator.id)
    .eq('active', true);

  const setup = operatorSetup(operator, activePackages ?? 0);
  if (!setup.requestable) {
    return NextResponse.json(
      { error: `${operator.name} hasn't finished setting up yet — still waiting on ${pendingLabel(setup.pending)}. You'll be able to request them once that's done.` },
      { status: 409 },
    );
  }

  const ownerProfile = (operator.profiles as any);

  // Create partnership in pending state
  const { data: partnership, error } = await admin
    .from('partnerships')
    .insert({
      building_id: buildingId,
      operator_id: operatorId,
      status: 'pending',
      requested_by: session.user.id,
    })
    .select()
    .single();
  if (error || !partnership) {
    return NextResponse.json({ error: error?.message ?? 'Failed to create request' }, { status: 500 });
  }

  // Email operator, with enough building detail to judge the request and a
  // reply-to so they can ask the manager questions directly.
  if (ownerProfile?.email) {
    const address = [building.address_line1, [building.city, building.region].filter(Boolean).join(', ')]
      .filter(Boolean)
      .join(' · ') || null;
    await sendPartnershipRequest({
      to: ownerProfile.email,
      operatorName: ownerProfile.full_name ?? operator.name,
      buildingName: building.name,
      managerName: session.profile.full_name,
      managerEmail: session.profile.email,
      partnershipId: partnership.id,
      buildingAddress: address,
      buildingUnits: building.total_units,
      washDay: building.wash_day ?? building.preferred_wash_day ?? null,
      requestedDates: futureDates(parseDateList(building.requested_wash_dates)),
    }).catch(() => {});
  }

  await sendAdminNotification({
    subject: `Partnership request: ${building.name} → ${operator.name}`,
    lines: [
      `${session.profile.full_name} (${session.profile.email}) requested a partnership.`,
      `Building: ${building.name}`,
      `Operator: ${operator.name}`,
      `Partnership ID: ${partnership.id}`,
    ],
    replyTo: session.profile.email || undefined,
  }).catch(() => {});

  return NextResponse.json({ partnershipId: partnership.id });
}
