import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const { washDayId } = await req.json();
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: resident } = await sb.from('residents').select('id').eq('profile_id', user.id).maybeSingle();
  if (!resident) return NextResponse.json({ error: 'no resident' }, { status: 404 });

  await sb.from('wash_skips').upsert({
    resident_id: resident.id,
    wash_day_id: washDayId,
  }, { onConflict: 'resident_id,wash_day_id' });

  return NextResponse.json({ success: true });
}
