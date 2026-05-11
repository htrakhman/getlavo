import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const sb = supabaseAdmin();
  await sb.from('washes').update({ status: 'in_progress' }).eq('id', params.id);
  return NextResponse.json({ success: true });
}
