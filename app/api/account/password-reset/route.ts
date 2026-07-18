import { NextResponse } from 'next/server';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';

// Sends a password reset email to the signed-in user. Kept server-side: the
// browser-client version of this silently did nothing when the client-side
// auth session was unavailable.
export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const email = session.profile.email || session.user.email;
  if (!email) return NextResponse.json({ error: 'No email on file for this account' }, { status: 400 });

  const origin =
    process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin || 'https://www.getlavo.io';

  const sb = supabaseServer();
  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
