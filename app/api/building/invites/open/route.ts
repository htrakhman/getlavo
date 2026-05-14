import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Public endpoint: invite token is the bearer credential. Fires when the
// invitee clicks their unique link before they sign up.
export async function POST(req: Request) {
  const { token } = await req.json().catch(() => ({}));
  if (!token || typeof token !== 'string') {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { data: invite } = await sb
    .from('building_invites')
    .select('id, status')
    .eq('token', token)
    .maybeSingle();

  if (!invite) return NextResponse.json({ ok: false }, { status: 404 });
  if (invite.status !== 'sent') return NextResponse.json({ ok: true, already: true });

  await sb.from('building_invites').update({ status: 'opened' }).eq('id', invite.id);
  return NextResponse.json({ ok: true });
}
