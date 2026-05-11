import { NextResponse } from 'next/server';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendPartnershipAccepted } from '@/lib/email/resend';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionUser();
  if (!session || !session.portals.includes('operator')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sb = supabaseServer();
  const admin = supabaseAdmin();

  // Load partnership with related data
  const { data: partnership } = await sb
    .from('partnerships')
    .select('id, status, building_id, operator_id, requested_by, building:buildings(name, manager_id), operator:operators(name, owner_id)')
    .eq('id', params.id)
    .eq('status', 'pending')
    .single();

  if (!partnership) return NextResponse.json({ error: 'Partnership request not found' }, { status: 404 });

  const operator = partnership.operator as any;
  if (operator.owner_id !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Activate the partnership
  const { error } = await admin
    .from('partnerships')
    .update({
      status: 'active',
      responded_at: new Date().toISOString(),
      connected_at: new Date().toISOString(),
    })
    .eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Email the building manager
  const building = partnership.building as any;
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

  return NextResponse.json({ ok: true });
}
