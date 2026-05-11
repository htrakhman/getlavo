import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const sb = supabaseAdmin();
  await sb.from('wash_days').update({ started_at: new Date().toISOString() }).eq('id', params.id);
  return NextResponse.json({ success: true });
}
