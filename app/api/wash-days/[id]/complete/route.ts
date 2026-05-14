import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { loadWashDayForOperator } from '@/lib/auth/wash-ownership';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const admin = supabaseAdmin();
  const check = await loadWashDayForOperator(admin, params.id, session.user.id);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  await admin.from('wash_days').update({ completed_at: new Date().toISOString() }).eq('id', params.id);
  return NextResponse.json({ success: true });
}
