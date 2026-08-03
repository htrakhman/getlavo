/**
 * Regression guard for the cancellation refund window.
 * Run: npx tsx --tsconfig tsconfig.scripts.json scripts/cancellation-policy-test.ts
 *
 * The bug this exists to prevent: the 24-hour window was published on the
 * homepage, on /help and at checkout, and enforced nowhere. /api/bookings/:id/
 * cancel refunded any booking at any time — including one cancelled while the
 * crew was already at the building. The window now lives in one module that
 * the copy, the button and the API all read, so the only way they can disagree
 * again is if this file stops passing.
 *
 * The DST cases are the ones worth keeping honest: a wash time is a New York
 * wall clock, not a fixed UTC offset, so a naive `date + "T13:00Z"` puts the
 * deadline an hour off for half the year — which is an hour of refunds given
 * away, or refused, on exactly the bookings nobody is watching.
 */

import {
  CANCELLATION_CUTOFF_HOURS,
  bookingStartsAt,
  cancellationNotice,
  parseSlotHour,
  refundEligibility,
} from '../lib/cancellation-policy';

let failures = 0;
function check(name: string, cond: boolean) {
  if (!cond) {
    console.error(`FAIL: ${name}`);
    failures++;
  }
}
function eq(name: string, actual: unknown, expected: unknown) {
  check(`${name} (got ${String(actual)}, want ${String(expected)})`, actual === expected);
}

// ── Slot parsing ────────────────────────────────────────────────────────────
eq('1:00 PM → 13h', String(parseSlotHour('1:00 PM')), '13,0');
eq('12:00 PM is noon', String(parseSlotHour('12:00 PM')), '12,0');
eq('12:00 AM is midnight', String(parseSlotHour('12:00 AM')), '0,0');
eq('8:00 AM → 8h', String(parseSlotHour('8:00 AM')), '8,0');
eq('lowercase am parses', String(parseSlotHour('9:30 am')), '9,30');
eq('24-hour rows still parse', String(parseSlotHour('13:00')), '13,0');
eq('empty slot is null', parseSlotHour(''), null);
eq('null slot is null', parseSlotHour(null), null);
eq('garbage is null', parseSlotHour('sometime'), null);
eq('13:00 PM is not a time', parseSlotHour('13:00 PM'), null);

// ── Wall clock → instant, across DST ────────────────────────────────────────
// Aug 7 2026 is EDT (UTC-4): 1:00 PM local is 17:00Z.
eq(
  'summer slot resolves in EDT',
  bookingStartsAt('2026-08-07', '1:00 PM')?.toISOString(),
  '2026-08-07T17:00:00.000Z',
);
// Jan 15 2026 is EST (UTC-5): 1:00 PM local is 18:00Z.
eq(
  'winter slot resolves in EST',
  bookingStartsAt('2026-01-15', '1:00 PM')?.toISOString(),
  '2026-01-15T18:00:00.000Z',
);
// A booking with no time is scheduled for the day, so the day is what counts.
eq(
  'slotless booking starts at local midnight',
  bookingStartsAt('2026-08-07', null)?.toISOString(),
  '2026-08-07T04:00:00.000Z',
);
eq('unparseable date has no start', bookingStartsAt('not-a-date', '1:00 PM'), null);

// US DST ends 2026-11-01. A wash the morning after the change is EST, and the
// deadline 24h earlier falls on the EDT side — the case a fixed offset gets
// wrong by exactly one hour.
const afterFallBack = bookingStartsAt('2026-11-01', '10:00 AM');
eq('the morning after fall-back is EST', afterFallBack?.toISOString(), '2026-11-01T15:00:00.000Z');

// ── The window ──────────────────────────────────────────────────────────────
const wash = { date: '2026-08-07', slot: '1:00 PM' }; // 2026-08-07T17:00Z

function at(iso: string) {
  return refundEligibility(wash.date, wash.slot, new Date(iso));
}

check('a week out is refundable', at('2026-07-31T12:00:00Z').refundable);
check('25 hours out is refundable', at('2026-08-06T16:00:00Z').refundable);
check('exactly 24 hours out is still refundable', at('2026-08-06T17:00:00Z').refundable);
check('one second past the deadline is not', !at('2026-08-06T17:00:01Z').refundable);
check('23 hours out is not refundable', !at('2026-08-06T18:00:00Z').refundable);
check('an hour before the wash is not refundable', !at('2026-08-07T16:00:00Z').refundable);
check('after the wash is not refundable', !at('2026-08-08T12:00:00Z').refundable);

eq(
  'the deadline is the cutoff before the start',
  at('2026-07-31T12:00:00Z').deadline?.toISOString(),
  '2026-08-06T17:00:00.000Z',
);
eq('hours until start counts down', Math.round(at('2026-08-06T17:00:00Z').hoursUntilStart ?? 0), 24);
eq('a past wash reports negative hours', at('2026-08-08T17:00:00Z').hoursUntilStart, -24);

// An unreadable date can't be proven outside the window, so it doesn't get a
// refund — the server never pays out on a claim it can't check.
check('unparseable date is not refundable', !refundEligibility('garbage', '1:00 PM').refundable);
check('unparseable date has no deadline', refundEligibility('garbage', null).deadline === null);

// A slotless booking's window is measured from the start of its day.
const daily = refundEligibility('2026-08-07', null, new Date('2026-08-06T03:00:00Z'));
check('slotless: 25h before the day is refundable', daily.refundable);
check(
  'slotless: 23h before the day is not',
  !refundEligibility('2026-08-07', null, new Date('2026-08-06T05:00:00Z')).refundable,
);

// ── Copy tracks the rule ────────────────────────────────────────────────────
check(
  'refundable notice names the deadline',
  cancellationNotice(at('2026-07-31T12:00:00Z')).startsWith('Free cancellation until'),
);
check(
  'unrefundable notice says so',
  cancellationNotice(at('2026-08-07T16:00:00Z')).includes("can't be refunded"),
);
eq('the published cutoff is 24 hours', CANCELLATION_CUTOFF_HOURS, 24);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log('cancellation-policy: all checks passed');
