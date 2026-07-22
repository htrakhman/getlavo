import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendPasswordResetEmail } from '@/lib/email/password-reset';

export type PasswordResetResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

const GENERIC_ERROR = 'Could not send reset email — please try again.';

/**
 * Generates a password-recovery token via the Supabase admin API and emails the
 * link through Resend (our working email provider). Replaces the previous
 * `supabase.auth.resetPasswordForEmail` call, which relied on Supabase's own —
 * unconfigured — SMTP and silently failed (no email, recovery_sent_at null).
 *
 * The link points at our existing /auth/confirm handler, which verifies the OTP
 * and forwards to /reset-password, so the rest of the reset flow is unchanged.
 */
export async function sendPasswordReset(email: string, origin: string): Promise<PasswordResetResult> {
  const admin = supabaseAdmin();

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${origin}/reset-password` },
  });

  if (error) {
    // Unknown address: never reveal whether an account exists. Behave exactly as
    // if the email was sent. Genuine infrastructure errors still surface below.
    if (/not\s*found|no\s*user|user.*(exist|found)|invalid/i.test(error.message)) {
      return { ok: true };
    }
    console.error('[password-reset] generateLink failed:', error.message);
    return { ok: false, status: 500, error: GENERIC_ERROR };
  }

  const hashedToken = data?.properties?.hashed_token;
  if (!hashedToken) {
    console.error('[password-reset] generateLink returned no hashed_token');
    return { ok: false, status: 500, error: GENERIC_ERROR };
  }

  // Carry the token in the URL PATH, not a query string. A `token_hash=<hex>`
  // query string is corrupted in email transit: `=` immediately followed by two
  // hex digits is a valid quoted-printable escape, so a mail hop can swallow the
  // separator into a single (often non-printable) byte, and /auth/confirm then
  // never receives token_hash. A path form has no `=`/`&` to misread.
  const resetUrl = `${origin}/auth/confirm/recovery/${encodeURIComponent(hashedToken)}`;

  try {
    await sendPasswordResetEmail({ to: email, resetUrl });
  } catch (e) {
    // Do NOT swallow send failures as success — that is exactly what hid the
    // original outage. Surface a real error so the user retries and we can see it.
    console.error('[password-reset] Resend send failed:', e);
    return { ok: false, status: 500, error: GENERIC_ERROR };
  }

  return { ok: true };
}
