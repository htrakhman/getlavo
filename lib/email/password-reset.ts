import { Resend } from 'resend';
import { wrapEmail, paragraph } from '@/lib/email/template';

const FROM = process.env.RESEND_FROM_EMAIL || 'Lavo <hello@getlavo.io>';

/**
 * Sends the password-reset email through Resend — the same delivery pipeline the
 * rest of the app already uses successfully. We do NOT rely on Supabase's own
 * `resetPasswordForEmail` SMTP: that path depends on Supabase's separately
 * configured SMTP, which was not sending (recovery_sent_at stayed null and no
 * email arrived). The recovery link is generated with the Supabase admin API and
 * delivered here instead.
 */
export async function sendPasswordResetEmail({ to, resetUrl }: { to: string; resetUrl: string }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is not set');
  const resend = new Resend(key);

  const content = [
    paragraph('We received a request to reset the password for your Lavo account.'),
    paragraph('Click the button below to choose a new password. This link expires in 1 hour and can only be used once.'),
    `<p style="margin:24px 0;"><a href="${resetUrl}" style="display:inline-block;padding:12px 20px;border-radius:8px;background:#00e5c8;color:#0a0a0a;font-weight:600;text-decoration:none;">Reset password</a></p>`,
    paragraph('If you did not request this, you can safely ignore this email — your password will not change.'),
  ].join('');

  return resend.emails.send({
    from: FROM,
    to,
    subject: 'Reset your Lavo password',
    html: wrapEmail({ preheader: 'Reset your Lavo password', content }),
  });
}
