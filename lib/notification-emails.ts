/**
 * Extra addresses copied on a profile's notification emails.
 *
 * Kept in one place because two callers have to agree: the account route
 * that stores the list and the senders that expand it. A stray duplicate
 * of the primary address is the failure mode that matters — it sends the
 * resident two of every email — so normalization happens on write and
 * again on read.
 */

export const MAX_NOTIFICATION_EMAILS = 3;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string) {
  const v = value.trim();
  return v.length <= 254 && EMAIL_RE.test(v);
}

/** Lowercase, trim, drop invalid/duplicate entries and the primary address. */
export function normalizeNotificationEmails(
  input: readonly (string | null | undefined)[] | null | undefined,
  primaryEmail?: string | null,
): string[] {
  const primary = primaryEmail?.trim().toLowerCase() ?? '';
  const out: string[] = [];
  for (const raw of input ?? []) {
    const email = (raw ?? '').trim().toLowerCase();
    if (!email || !isValidEmail(email)) continue;
    if (email === primary) continue;
    if (out.includes(email)) continue;
    out.push(email);
    if (out.length >= MAX_NOTIFICATION_EMAILS) break;
  }
  return out;
}

/**
 * Every address that should receive a notification for this profile:
 * the primary first, then the extras. Empty when there is no primary —
 * extras are copies of a resident's mail, not a standalone destination.
 */
export function notificationRecipients(profile: {
  email?: string | null;
  notification_emails?: string[] | null;
}): string[] {
  const primary = profile.email?.trim();
  if (!primary) return [];
  return [primary, ...normalizeNotificationEmails(profile.notification_emails, primary)];
}
