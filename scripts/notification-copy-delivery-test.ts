/**
 * Proves the one property the extra notification addresses depend on:
 * a copy goes out even when the send to the primary address fails.
 *
 * Run: npx tsx --tsconfig tsconfig.scripts.json scripts/notification-copy-delivery-test.ts
 *
 * This is the bug that made the feature look broken. The extras used to ride
 * along as `cc` on the resident's own message — one message, one delivery
 * outcome — so a primary address the provider refused took the copies with it
 * and the partner who was added precisely to hear about the wash heard nothing.
 * `emails.send` resolving with `{ error }` rather than rejecting meant it
 * happened silently.
 *
 * The stub stands in for Resend at the fetch layer, refuses the primary
 * address the way an undeliverable domain is refused, and checks that the copy
 * was still requested — and that the caller still learns the primary failed.
 */

process.env.RESEND_API_KEY ||= 're_test_key_not_used_against_the_api';

import { sendWithCopies } from '../lib/email/resend';
import { residentCancelIcs, residentInviteIcs } from '../lib/booking-calendar';

const PRIMARY = 'resident@undeliverable.invalid';
const COPY = 'partner@example.com';

let failures = 0;
function check(name: string, cond: boolean) {
  if (!cond) {
    console.error(`FAIL: ${name}`);
    failures++;
  }
}

type SentMessage = { to: string[] };

/** Refuses anything addressed to the primary, accepts everything else. */
function stubResend(): SentMessage[] {
  const sent: SentMessage[] = [];
  globalThis.fetch = (async (_url: any, init: any) => {
    const body = JSON.parse(init.body);
    const to: string[] = Array.isArray(body.to) ? body.to : [body.to];
    sent.push({ to });
    if (to.includes(PRIMARY)) {
      return new Response(
        JSON.stringify({ statusCode: 422, name: 'validation_error', message: 'Invalid recipient' }),
        { status: 422, headers: { 'content-type': 'application/json' } },
      );
    }
    return new Response(JSON.stringify({ id: 'msg_ok' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as any;
  return sent;
}

async function main() {
  const payload = {
    from: 'Lavo <hello@getlavo.io>',
    to: PRIMARY,
    subject: 'Your wash is booked — 2026-08-07',
    html: '<p>Booked.</p>',
  };

  // A refused primary must not swallow the copy.
  let sent = stubResend();
  let threw = false;
  await sendWithCopies(payload, [COPY]).catch(() => {
    threw = true;
  });

  check('the copy is still sent when the primary is refused', sent.some((m) => m.to.includes(COPY)));
  check('the copy is its own message, not a cc on the primary', sent.length === 2);
  check(
    'the copy is addressed only to the extra address',
    sent.some((m) => m.to.length === 1 && m.to[0] === COPY),
  );
  check('a refused primary is reported to the caller', threw);

  // The copy is an extra send, not a replacement: the resident is still
  // addressed on their own message.
  check('the primary is still addressed', sent.some((m) => m.to.includes(PRIMARY)));

  // No extras configured means exactly one message — no empty second send.
  sent = stubResend();
  await sendWithCopies({ ...payload, to: COPY }, []).catch(() => {});
  check('no extras means a single message', sent.length === 1);

  // A cancellation has to withdraw the event, not re-invite to it. A calendar
  // ignores a CANCEL whose SEQUENCE is below the copy it holds, which would
  // leave a wash nobody is coming to sitting on the resident's calendar.
  const details = {
    bookingId: 'b1',
    scheduledFor: '2026-08-07',
    timeSlot: '9:00 AM',
    buildingName: 'QA Test Towers',
    vehicleDesc: 'Blue Honda Civic',
  };
  const attendee = { email: PRIMARY, name: 'Dana' };
  const cancel = residentCancelIcs(details, attendee);
  const invite = residentInviteIcs(details, attendee);

  check('cancellation uses METHOD:CANCEL', cancel.includes('METHOD:CANCEL'));
  check('cancellation marks the event cancelled', cancel.includes('STATUS:CANCELLED'));
  check('the invite is still CONFIRMED', invite.includes('STATUS:CONFIRMED'));
  check(
    'cancellation targets the same event as the invite',
    cancel.includes('UID:b1@getlavo.io') && invite.includes('UID:b1@getlavo.io'),
  );
  check(
    'cancellation outranks the invite it withdraws',
    sequenceOf(cancel) > sequenceOf(invite),
  );
  check('a cancellation asks for no RSVP', !cancel.includes('RSVP=TRUE'));

  if (failures) {
    console.error(`\n${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log('notification-copy-delivery: all checks passed');
}

function sequenceOf(ics: string) {
  return Number(/SEQUENCE:(\d+)/.exec(ics)?.[1] ?? -1);
}

main();
