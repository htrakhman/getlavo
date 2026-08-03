/**
 * Proves the refund email says the things a refunded resident needs to hear.
 *
 * Run: npx tsx --tsconfig tsconfig.scripts.json scripts/refund-notice-test.ts
 *
 * A refund is invisible while it's in flight. Stripe releases the money the
 * moment we ask, but the credit takes the better part of a week to post, so
 * between the cancellation and the statement there is a stretch where a
 * resident has no evidence they're getting their money back. That silence is
 * what produces support tickets, and chargebacks on payments we already
 * refunded. The email closes it, which only works if it actually carries the
 * amount and the wait — hence these checks.
 *
 * The stub stands in for Resend at the fetch layer and reads back what would
 * have been sent.
 */

process.env.RESEND_API_KEY ||= 're_test_key_not_used_against_the_api';

import { sendRefundIssued } from '../lib/email/resend';
import { notifyRefunded } from '../lib/refund';

let failures = 0;
function check(name: string, cond: boolean) {
  if (!cond) {
    console.error(`FAIL: ${name}`);
    failures++;
  }
}

type SentMessage = { to: string[]; subject: string; html: string };

function stubResend(): SentMessage[] {
  const sent: SentMessage[] = [];
  globalThis.fetch = (async (_url: any, init: any) => {
    const body = JSON.parse(init.body);
    sent.push({
      to: Array.isArray(body.to) ? body.to : [body.to],
      subject: body.subject ?? '',
      html: body.html ?? '',
    });
    return new Response(JSON.stringify({ id: 'msg_ok' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as any;
  return sent;
}

async function main() {
  let sent = stubResend();
  await sendRefundIssued({
    to: 'resident@example.com',
    copies: ['partner@example.com'],
    recipientName: 'Dana',
    amountCents: 500,
    buildingName: 'QA Test Towers',
    scheduledFor: 'Aug 7, 2026',
    timeSlot: '1:00 PM',
  });

  const primary = sent.find((m) => m.to.includes('resident@example.com'));
  check('the resident is emailed', !!primary);
  const html = primary?.html ?? '';

  // The amount is the whole point: "you were refunded" without a number is a
  // resident checking their statement against a figure they have to remember.
  check('the subject names the amount', (primary?.subject ?? '').includes('$5.00'));
  check('the body states the amount', html.includes('$5.00'));

  // The wait is the part that stops a day-three statement check from reading
  // as a refund that failed. Stripe's published window for card refunds.
  check('the body gives the 5–10 business day window', /5[–-]10 business days/.test(plain(html)));

  // Nobody can redirect a refund, and saying so heads off the "can you send it
  // to a different card" reply.
  check('the body says it goes back to the original payment method', /original payment method/i.test(html));
  check('the body names the wash it belongs to', html.includes('Aug 7, 2026'));
  check('the body names the building', html.includes('QA Test Towers'));

  // Same independent-delivery guarantee as every other resident email.
  check('the extra address gets its own message', sent.some((m) => m.to.length === 1 && m.to[0] === 'partner@example.com'));
  check('the copy is not a cc on the resident message', sent.length === 2);

  // A missing time slot is a date-only booking, not a reason to print "null".
  sent = stubResend();
  await sendRefundIssued({
    to: 'resident@example.com',
    recipientName: 'Dana',
    amountCents: 12345,
    buildingName: null,
    scheduledFor: 'Aug 14, 2026',
    timeSlot: null,
  });
  check('a slotless booking prints the date alone', !/null|undefined/.test(sent[0]?.html ?? ''));
  check('larger amounts are formatted with a separator', (sent[0]?.html ?? '').includes('$123.45'));

  // Nothing moved means nothing to announce. Guarded before the booking is
  // even read, so a zero never reaches the resident as "we refunded $0.00".
  sent = stubResend();
  await notifyRefunded(null as any, 'booking-1', 0);
  await notifyRefunded(null as any, 'booking-1', Number.NaN);
  check('a zero refund sends nothing', sent.length === 0);

  if (failures) {
    console.error(`\n${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log('refund-notice: all checks passed');
}

/** Tags and whitespace stripped, so a phrase split by `<strong>` still reads. */
function plain(html: string) {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
}

main();
