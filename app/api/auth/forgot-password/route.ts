import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, clientIp, rateLimitResponse } from '@/lib/rate-limit';
import { sendPasswordReset } from '@/lib/auth/send-password-reset';

// Public password-reset trigger for logged-out users (the /forgot-password page).
// Delivery goes through Resend (our working email provider) via the shared
// sendPasswordReset helper, not Supabase's own SMTP — which was not sending the
// recovery email at all (recovery_sent_at stayed null). Errors from that helper
// are surfaced as a 500 rather than masked as success, so real failures are
// visible instead of silently swallowed.
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

  const result = await sendPasswordReset(email, origin);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ success: true });
}
