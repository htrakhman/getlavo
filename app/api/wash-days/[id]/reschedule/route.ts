import { NextResponse } from 'next/server';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { audit } from '@/lib/audit';
import { notify } from '@/lib/notify';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { newDate } = (await req.json()) as { newDate: string };
  if (!newDate) return NextResponse.json({ error: 'missing newDate' }, { status: 400 });

  const sb = supabaseServer();
  const { data: wd } = await sb
    .from('wash_days')
    .select('id, building_id, operator_id, scheduled_for, completed_at, building:buildings(name, manager_id), operator:operators(name, owner_id)')
    .eq('id', params.id)
    .maybeSingle();
  if (!wd) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (wd.completed_at) return NextResponse.json({ error: 'already completed' }, { status: 400 });

  // Either the operator owner OR the building manager can reschedule
  const isOperator = !!(await sb.from('operators').select('id').eq('id', wd.operator_id).eq('owner_id', session.user.id).maybeSingle()).data;
  const isManager = (wd.building as any)?.manager_id === session.user.id;
  if (!isOperator && !isManager) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const admin = supabaseAdmin();
  await admin.from('wash_days').update({
    scheduled_for: newDate,
    confirmation: 'pending',
    proposed_for: newDate,
    proposed_by: session.user.id,
  }).eq('id', params.id);

  // Notify the *other* party so they can re-confirm
  const counterpartyProfileId = isOperator ? (wd.building as any)?.manager_id : (wd.operator as any)?.owner_id;
  if (counterpartyProfileId) {
    await notify(counterpartyProfileId, 'operator_assigned', {
      operatorName: (wd.operator as any)?.name,
      buildingName: `Wash day moved to ${newDate}`,
      link: isOperator ? '/building/wash-days' : '/operator/wash-days',
    });
  }

  // Notify subscribed residents the date moved
  const { data: residents } = await admin
    .from('residents')
    .select('profile_id')
    .eq('building_id', wd.building_id)
    .eq('is_subscribed', true);
  for (const r of residents ?? []) {
    await notify(r.profile_id, 'wash_reminder', {
      buildingName: (wd.building as any)?.name,
      link: '/resident/washes',
    });
  }

  await audit({
    actorId: session.user.id,
    actorRole: isOperator ? 'operator' : 'building_manager',
    action: 'wash_day.reschedule',
    entityType: 'wash_day',
    entityId: params.id,
    metadata: { from: wd.scheduled_for, to: newDate },
  });

  return NextResponse.json({ success: true });
}
