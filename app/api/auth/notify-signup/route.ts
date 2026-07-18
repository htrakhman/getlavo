import { NextResponse } from 'next/server';
import { supabaseServer, supabaseAdmin } from '@/lib/supabase/server';
import { notifySignup } from '@/lib/auth/notify-signup';

/**
 * Fires the internal new-signup notification for the authenticated user.
 * Called from client-side signup flows that never pass through a server
 * callback (auto-confirmed email signups, role selection on /auth/pick-role).
 * Idempotent: the `signup_notified` metadata flag ensures one email per user.
 */
export async function POST() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (user.user_metadata?.signup_notified) return NextResponse.json({ ok: true });

  const { data: profile } = await supabaseAdmin()
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .maybeSingle();

  await notifySignup({
    email: user.email!,
    name: profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name,
    role: profile?.role || user.user_metadata?.role,
    method: user.app_metadata?.provider === 'google' ? 'google' : 'email',
  });
  await sb.auth.updateUser({ data: { signup_notified: true } }).catch(() => {});

  return NextResponse.json({ ok: true });
}
