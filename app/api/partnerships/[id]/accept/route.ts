import { NextResponse } from 'next/server';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendPartnershipAccepted, sendPartnershipAcceptedByManager } from '@/lib/email/resend';
import { maybeNotifyBuildingLive } from '@/lib/building-activation';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = supabaseServer();
  const admin = supabaseAdmin();

  const { data: partnership } = await sb
    .from('partnerships')
    .select(
      'id, status, building_id, operator_id, requested_by, building:buildings(name, manager_id), operator:operators(name, owner_id)',
    )
    .eq('id', params.id)
    .eq('status', 'pending')
    .single();

  if (!partnership) return NextResponse.json({ error: 'Partnership request not found' }, { status: 404 });

  const building = partnership.building as { name: string; manager_id: string };
  const operator = partnership.operator as { name: string; owner_id: string };
  const operatorInitiated = partnership.requested_by === operator.owner_id;
  const managerInitiated = partnership.requested_by === building.manager_id;

  if (operatorInitiated) {
    if (!session.portals.includes('building') || building.manager_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } else if (managerInitiated) {
    if (!session.portals.includes('operator') || operator.owner_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } else {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await admin
    .from('partnerships')
    .update({
      status: 'active',
      responded_at: new Date().toISOString(),
      connected_at: new Date().toISOString(),
    })
    .eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (operatorInitiated) {
    const { data: ownerProfile } = await admin
      .from('profiles')
      .select('email, full_name')
      .eq('id', operator.owner_id)
      .single();
    const { data: managerProfile } = await admin
      .from('profiles')
      .select('full_name')
      .eq('id', building.manager_id)
      .single();

    if (ownerProfile?.email) {
      await sendPartnershipAcceptedByManager({
        to: ownerProfile.email,
        operatorName: ownerProfile.full_name ?? operator.name,
        buildingName: building.name,
        managerName: managerProfile?.full_name ?? 'Your building manager',
      }).catch(() => {});
    }
  } else {
    const { data: managerProfile } = await admin
      .from('profiles')
      .select('email, full_name')
      .eq('id', partnership.requested_by)
      .single();

    if (managerProfile?.email) {
      await sendPartnershipAccepted({
        to: managerProfile.email,
        managerName: managerProfile.full_name,
        buildingName: building.name,
        operatorName: operator.name,
      }).catch(() => {});
    }
  }

  await admin.from('buildings').update({ status: 'active' }).eq('id', partnership.building_id);
  await maybeNotifyBuildingLive(partnership.building_id).catch((e) =>
    console.error('maybeNotifyBuildingLive', e),
  );

  return NextResponse.json({ ok: true });
}
