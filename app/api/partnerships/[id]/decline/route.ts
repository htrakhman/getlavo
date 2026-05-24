import { NextResponse } from 'next/server';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = supabaseServer();
  const admin = supabaseAdmin();

  const { data: partnership } = await sb
    .from('partnerships')
    .select('id, status, requested_by, building:buildings(manager_id), operator:operators(owner_id)')
    .eq('id', params.id)
    .eq('status', 'pending')
    .single();

  if (!partnership) return NextResponse.json({ error: 'Partnership request not found' }, { status: 404 });

  const building = (partnership.building as any) ?? {};
  const operator = (partnership.operator as any) ?? {};
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
      status: 'declined',
      responded_at: new Date().toISOString(),
    })
    .eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
