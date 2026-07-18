const ROLE_LABELS: Record<string, string> = {
  building_manager: 'Property Manager',
  resident: 'Resident',
  operator: 'Wash Crew Operator',
};

const NOTIFY_TO = process.env.SUPPORT_EMAIL || process.env.ADMIN_EMAIL || 'harold@getlavo.io';

export async function notifySignup({
  email,
  name,
  role,
  method,
}: {
  email: string;
  name?: string | null;
  role?: string | null;
  method: 'email' | 'google';
}) {
  if (!process.env.RESEND_API_KEY) return;
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const roleLabel = role ? (ROLE_LABELS[role] ?? role) : 'Unknown';
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Lavo <hello@getlavo.io>',
      to: NOTIFY_TO,
      subject: `New signup: ${roleLabel}`,
      html: `
        <p><strong>New user signed up on Lavo</strong></p>
        <table cellpadding="6" style="font-family:sans-serif;font-size:14px;">
          <tr><td style="color:#666">Name</td><td>${escapeHtml(name || '—')}</td></tr>
          <tr><td style="color:#666">Email</td><td>${escapeHtml(email)}</td></tr>
          <tr><td style="color:#666">Role</td><td>${escapeHtml(roleLabel)}</td></tr>
          <tr><td style="color:#666">Method</td><td>${method === 'google' ? 'Google OAuth' : 'Email / password'}</td></tr>
        </table>
      `,
    });
  } catch {
    // fire-and-forget — never block the auth flow
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
