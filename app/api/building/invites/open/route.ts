import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  const { token } = await req.json().catch(() => ({}));
  if (!token) return NextResponse.json({ ok: false }, { status: 400 });
  const sb = supabaseAdmin();
  await sb.from('building_invites').update({ status: 'opened' }).eq('token', token).eq('status', 'sent');
  return NextResponse.json({ ok: true });
}
