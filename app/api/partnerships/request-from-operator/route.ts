import { NextResponse } from 'next/server';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendOperatorPartnershipInterest } from '@/lib/email/resend';
import { z } from 'zod';

const Body = z.object({
  buildingId: z.string().uuid(),
});

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
    .select('id, name, owner_id, status, stripe_onboarding_complete')
    .eq('owner_id', session.user.id)
    .maybeSingle();

  if (!operator) return NextResponse.json({ error: 'Operator not found' }, { status: 404 });
  if (operator.status !== 'approved') {
    return NextResponse.json({ error: 'Your operator profile must be approved first' }, { status: 403 });
  }
  if (!operator.stripe_onboarding_complete) {
    return NextResponse.json({ error: 'Connect Stripe before requesting buildings' }, { status: 403 });
  }

  const { data: building } = await admin
    .from('buildings')
    .select('id, name, manager_id, status')
    .eq('id', buildingId)
    .in('status', ['prospect', 'pilot', 'active'])
    .single();
  if (!building) return NextResponse.json({ error: 'Building not found' }, { status: 404 });

  const { data: existing } = await admin
    .from('partnerships')
    .select('id, status, operator_id')
    .eq('building_id', buildingId)
    .in('status', ['active', 'pending'])
    .maybeSingle();

  if (existing) {
    if (existing.status === 'active') {
      return NextResponse.json({ error: 'This building already has an operator' }, { status: 409 });
    }
    if (existing.operator_id === operator.id) {
      return NextResponse.json({ error: 'You already have a pending request for this building' }, { status: 409 });
    }
    return NextResponse.json({ error: 'This building already has a pending partnership request' }, { status: 409 });
  }

  const { data: partnership, error } = await admin
    .from('partnerships')
    .insert({
      building_id: buildingId,
      operator_id: operator.id,
      status: 'pending',
      requested_by: session.user.id,
    })
    .select()
    .single();

  if (error || !partnership) {
    return NextResponse.json({ error: error?.message ?? 'Failed to create request' }, { status: 500 });
  }

  if (building.manager_id) {
    const { data: managerProfile } = await admin
      .from('profiles')
      .select('email, full_name')
      .eq('id', building.manager_id)
      .single();

    if (managerProfile?.email) {
      await sendOperatorPartnershipInterest({
        to: managerProfile.email,
        managerName: managerProfile.full_name ?? 'there',
        buildingName: building.name,
        operatorName: operator.name,
        partnershipId: partnership.id,
      }).catch(() => {});
    }
  }

  return NextResponse.json({ partnershipId: partnership.id });
}
