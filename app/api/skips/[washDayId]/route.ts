import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export async function DELETE(_req: Request, { params }: { params: { washDayId: string } }) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: resident } = await sb.from('residents').select('id').eq('profile_id', user.id).maybeSingle();
  if (!resident) return NextResponse.json({ error: 'no resident' }, { status: 404 });

  const { data: wd } = await sb.from('wash_days').select('scheduled_for').eq('id', params.washDayId).maybeSingle();
  if (wd) {
    const hoursUntil = (new Date(wd.scheduled_for).getTime() - Date.now()) / 3600000;
    if (hoursUntil < 12) {
      return NextResponse.json({ error: 'too late to undo' }, { status: 400 });
    }
  }

  await sb.from('wash_skips').delete()
    .eq('resident_id', resident.id)
    .eq('wash_day_id', params.washDayId);

  return NextResponse.json({ success: true });
}
