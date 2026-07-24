/**
 * Admin is granted by email address, not just the stored profile role, so the
 * founder can sign in with Google SSO and always land as an admin without a
 * manual DB edit. Configure additional admins via ADMIN_EMAILS (comma
 * separated); ADMIN_EMAIL (the ops inbox) is included too.
 */
const DEFAULT_ADMIN = 'harold@getlavo.io';

export function adminEmails(): string[] {
  const list = [
    DEFAULT_ADMIN,
    process.env.ADMIN_EMAIL ?? '',
    ...(process.env.ADMIN_EMAILS ?? '').split(','),
  ]
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set(list));
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.trim().toLowerCase());
}
