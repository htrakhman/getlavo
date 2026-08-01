import { NextResponse } from 'next/server';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendAdminNotification, sendPartnershipRequest } from '@/lib/email/resend';
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
    .select('id, name, manager_id')
    .eq('id', buildingId)
    .eq('manager_id', session.user.id)
    .single();
  if (!building) return NextResponse.json({ error: 'Building not found' }, { status: 404 });

  // Check no active partnership already exists for this building
  const { data: existing } = await sb
    .from('partnerships')
    .select('id, status')
    .eq('building_id', buildingId)
    .in('status', ['active', 'pending'])
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: existing.status === 'active' ? 'This building already has an active partner' : 'A request is already pending' },
      { status: 409 },
    );
  }

  // Fetch operator and owner email. Operators mid-setup and operators still
  // awaiting review are both listed in the marketplace, so "not ready" is a
  // distinct, explainable answer rather than a 404 — the UI disables the
  // button, this backs it up.
  const { data: operator } = await admin
    .from('operators')
    .select('id, name, owner_id, status, stripe_onboarding_complete, profiles:profiles!operators_owner_id_fkey(email, full_name)')
    .eq('id', operatorId)
    .in('status', ['approved', 'pending_review'])
    .single();
  if (!operator) return NextResponse.json({ error: 'Operator not found or not available' }, { status: 404 });
  if (operator.status !== 'approved') {
    return NextResponse.json(
      { error: `${operator.name} is still being verified by Lavo. You'll be able to request them once that's done.` },
      { status: 409 },
    );
  }
  if (!operator.stripe_onboarding_complete) {
    return NextResponse.json(
      { error: `${operator.name} hasn't finished setting up their payment account yet. You'll be able to request them once they do.` },
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

  // Email operator
  if (ownerProfile?.email) {
    await sendPartnershipRequest({
      to: ownerProfile.email,
      operatorName: ownerProfile.full_name ?? operator.name,
      buildingName: building.name,
      managerName: session.profile.full_name,
      partnershipId: partnership.id,
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
