const ROLE_LABELS: Record<string, string> = {
  building_manager: 'Property Manager',
  resident: 'Resident',
  operator: 'Wash Crew Operator',
};

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
  if (!process.env.RESEND_API_KEY || !process.env.SUPPORT_EMAIL) return;
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const roleLabel = role ? (ROLE_LABELS[role] ?? role) : 'Unknown';
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Lavo <hello@getlavo.io>',
      to: process.env.SUPPORT_EMAIL,
      subject: `New signup: ${roleLabel}`,
      html: `
        <p><strong>New user signed up on Lavo</strong></p>
        <table cellpadding="6" style="font-family:sans-serif;font-size:14px;">
          <tr><td style="color:#666">Name</td><td>${name || '—'}</td></tr>
          <tr><td style="color:#666">Email</td><td>${email}</td></tr>
          <tr><td style="color:#666">Role</td><td>${roleLabel}</td></tr>
          <tr><td style="color:#666">Method</td><td>${method === 'google' ? 'Google OAuth' : 'Email / password'}</td></tr>
        </table>
      `,
    });
  } catch {
    // fire-and-forget — never block the auth flow
  }
}
