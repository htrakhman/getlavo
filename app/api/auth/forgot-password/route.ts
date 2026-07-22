import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { rateLimit, clientIp, rateLimitResponse } from '@/lib/rate-limit';

// Public password-reset trigger for logged-out users (the /forgot-password page).
// Kept server-side for the same reason as the signed-in reset on the account page:
// the browser-client `resetPasswordForEmail` silently no-oped when no auth session
// was present — which is exactly the state of every user hitting this flow. Going
// through a same-origin route guarantees the request actually fires and the email
// is sent by the server.
export async function POST(req: NextRequest) {
  const rl = rateLimit(`forgot-pw:${clientIp(req)}`, { limit: 5, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse(rl);

  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  // Basic shape check only — never reveal whether the address has an account.
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }

  const origin =
    process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin || 'https://www.getlavo.io';

  const sb = supabaseServer();
  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  });
  // Swallow the specific error (e.g. unknown email) so we don't leak account
  // existence; a genuine outage still surfaces as a 500 for the client to retry.
  if (error && !/user|email|not found|invalid/i.test(error.message)) {
    return NextResponse.json({ error: 'Could not send reset email — please try again.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
