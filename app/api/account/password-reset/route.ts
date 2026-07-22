import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/supabase/server';
import { sendPasswordReset } from '@/lib/auth/send-password-reset';

// Sends a password reset email to the signed-in user. Delivery goes through
// Resend via the shared sendPasswordReset helper — the same fix as the
// logged-out flow — because Supabase's own SMTP was not sending the email.
export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const email = session.profile.email || session.user.email;
  if (!email) return NextResponse.json({ error: 'No email on file for this account' }, { status: 400 });

  const origin =
    process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin || 'https://www.getlavo.io';

  const result = await sendPasswordReset(email, origin);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ success: true });
}
