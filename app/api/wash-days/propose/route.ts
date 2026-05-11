import { NextResponse } from 'next/server';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { audit } from '@/lib/audit';
import { notify } from '@/lib/notify';

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { buildingId, scheduledFor } = await req.json();
  if (!buildingId || !scheduledFor) return NextResponse.json({ error: 'missing fields' }, { status: 400 });

  const sb = supabaseServer();

  // Verify operator owns an active partnership with this building
  const { data: op } = await sb.from('operators').select('id, name').eq('owner_id', session.user.id).maybeSingle();
  if (!op) return NextResponse.json({ error: 'no operator' }, { status: 403 });

  const { data: partnership } = await sb
    .from('partnerships')
    .select('id, building:buildings(name, manager_id)')
    .eq('operator_id', op.id)
    .eq('building_id', buildingId)
    .in('status', ['active', 'pilot'])
    .maybeSingle();
  if (!partnership) return NextResponse.json({ error: 'no partnership' }, { status: 403 });

  const admin = supabaseAdmin();
  const { data: row, error } = await admin.from('wash_days').insert({
    building_id: buildingId,
    operator_id: op.id,
    partnership_id: partnership.id,
    scheduled_for: scheduledFor,
    proposed_for: scheduledFor,
    proposed_by: session.user.id,
    confirmation: 'pending',
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const managerId = (partnership.building as any)?.manager_id;
  if (managerId) {
    await notify(managerId, 'operator_assigned', {
      operatorName: op.name,
      buildingName: (partnership.building as any)?.name,
      link: '/building/wash-days',
    });
  }

  await audit({
    actorId: session.user.id,
    actorRole: 'operator',
    action: 'wash_day.propose',
    entityType: 'wash_day',
    entityId: row.id,
    metadata: { buildingId, scheduledFor },
  });

  return NextResponse.json({ id: row.id });
}
