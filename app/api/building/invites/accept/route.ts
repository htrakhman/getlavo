import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const { token } = await req.json().catch(() => ({}));
  if (!token) return NextResponse.json({ ok: false }, { status: 400 });

  const sb = supabaseAdmin();
  const { data: invite } = await sb
    .from('building_invites')
    .select('id, email, status')
    .eq('token', token)
    .maybeSingle();

  if (!invite) return NextResponse.json({ ok: false }, { status: 404 });
  if (invite.status === 'accepted') return NextResponse.json({ ok: true, already: true });

  const sessionEmail = (session.profile.email ?? '').toLowerCase();
  if (!sessionEmail || sessionEmail !== invite.email.toLowerCase()) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  await sb
    .from('building_invites')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', invite.id);

  return NextResponse.json({ ok: true });
}
