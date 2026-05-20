import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { loadWashDayForOperator } from '@/lib/auth/wash-ownership';
import { onFirstWashDayCompleted } from '@/lib/building-activation';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const admin = supabaseAdmin();
  const check = await loadWashDayForOperator(admin, params.id, session.user.id);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const washDayId = params.id;
  const { data: washDay } = await admin
    .from('wash_days')
    .select('building_id')
    .eq('id', washDayId)
    .maybeSingle();

  await admin.from('wash_days').update({ completed_at: new Date().toISOString() }).eq('id', washDayId);

  if (washDay?.building_id) {
    await onFirstWashDayCompleted(washDay.building_id).catch((e) =>
      console.error('onFirstWashDayCompleted', e),
    );
  }

  return NextResponse.json({ success: true });
}
