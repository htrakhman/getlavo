import { NextResponse } from 'next/server';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { audit } from '@/lib/audit';
import { notify } from '@/lib/notify';
import { syncWashDayRoster } from '@/lib/wash-roster';
import { dateShort } from '@/lib/format';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { decision } = (await req.json()) as { decision: 'confirmed' | 'declined' };
  if (!['confirmed', 'declined'].includes(decision)) return NextResponse.json({ error: 'bad decision' }, { status: 400 });

  const sb = supabaseServer();
  const { data: wd } = await sb
    .from('wash_days')
    .select('id, building_id, operator_id, scheduled_for, building:buildings(name, manager_id)')
    .eq('id', params.id)
    .maybeSingle();
  if (!wd) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if ((wd.building as any)?.manager_id !== session.user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const admin = supabaseAdmin();
  await admin.from('wash_days').update({ confirmation: decision }).eq('id', params.id);

  if (decision === 'confirmed') {
    await syncWashDayRoster(admin, params.id);
  }

  // Close the loop with the operator who proposed the date.
  if (wd.operator_id) {
    const { data: op } = await admin
      .from('operators')
      .select('owner_id')
      .eq('id', wd.operator_id)
      .maybeSingle();
    if (op?.owner_id) {
      await notify(op.owner_id, decision === 'confirmed' ? 'wash_day_confirmed' : 'wash_day_declined', {
        buildingName: (wd.building as any)?.name,
        date: dateShort(wd.scheduled_for),
        link: '/operator/wash-days',
      });
    }
  }
  await audit({
    actorId: session.user.id,
    actorRole: 'building_manager',
    action: `wash_day.${decision}`,
    entityType: 'wash_day',
    entityId: params.id,
    metadata: { scheduledFor: wd.scheduled_for },
  });

  return NextResponse.json({ success: true });
}
