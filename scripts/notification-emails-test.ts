/**
 * Regression guard for the extra notification addresses on a profile.
 * Run: npx tsx --tsconfig tsconfig.scripts.json scripts/notification-emails-test.ts
 *
 * Three things this exists to prevent:
 *  1. The primary address surviving in the extras list. It is copied on every
 *     notification already, so a duplicate entry sends the resident two of
 *     every email — the fastest way to make people mute the account.
 *  2. An unbounded or unvalidated list. The account form posts free text; a
 *     typo'd address should be rejected on save rather than silently dropped,
 *     and the cap has to hold on the server, not only in the UI.
 *  3. Extras being treated as a standalone destination. They are copies of the
 *     resident's mail — with no primary address there is nobody to copy, and
 *     mailing the extras alone would leak a resident's wash schedule to a
 *     third party the account no longer belongs to.
 *  4. The primary address leaking back into the copies list. Copies go out as
 *     their own message now (lib/email/resend.ts), so a primary that survived
 *     the filter would send the resident two of every email rather than being
 *     collapsed by the mail provider as one `to`/`cc` list would have.
 */

import {
  MAX_NOTIFICATION_EMAILS,
  isValidEmail,
  normalizeNotificationEmails,
  notificationCopies,
} from '../lib/notification-emails';

let failures = 0;
function check(name: string, cond: boolean) {
  if (!cond) {
    console.error(`FAIL: ${name}`);
    failures++;
  }
}

function main() {
  const primary = 'dana@example.com';

  check('accepts a plain address', isValidEmail('partner@example.com'));
  check('rejects a bare word', !isValidEmail('partner'));
  check('rejects a missing domain dot', !isValidEmail('partner@example'));
  check('rejects embedded whitespace', !isValidEmail('part ner@example.com'));

  const cleaned = normalizeNotificationEmails(
    ['  Partner@Example.com ', 'partner@example.com', 'DANA@example.com', '', 'nope'],
    primary,
  );
  check('lowercases and trims', cleaned[0] === 'partner@example.com');
  check('drops the duplicate', cleaned.length === 1);
  check('drops the primary address in any case', !cleaned.includes(primary));
  check('drops invalid and empty entries', !cleaned.includes('nope'));

  const many = normalizeNotificationEmails(
    ['a@example.com', 'b@example.com', 'c@example.com', 'd@example.com', 'e@example.com'],
    primary,
  );
  check('caps the list server-side', many.length === MAX_NOTIFICATION_EMAILS);

  const copies = notificationCopies({
    email: primary,
    notification_emails: ['partner@example.com', primary],
  });
  check('extras are returned', copies.includes('partner@example.com'));
  check('the primary is never in the copies list', !copies.includes(primary));
  check('no duplicate of the primary', copies.length === 1);

  check(
    'no primary means no copies',
    notificationCopies({ email: null, notification_emails: ['partner@example.com'] }).length === 0,
  );
  check('missing column tolerated', notificationCopies({ email: primary }).length === 0);

  if (failures) {
    console.error(`\n${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log('notification-emails: all checks passed');
}

main();
