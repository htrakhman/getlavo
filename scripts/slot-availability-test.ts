/**
 * Regression guard for hour-level availability.
 * Run: npx tsx --tsconfig tsconfig.scripts.json scripts/slot-availability-test.ts
 *
 * The bug this exists to prevent: availability counted bookings per day and
 * never looked at time_slot, so an hour someone had already booked stayed on
 * the picker as if it were open. Three residents ended up confirmed for 1:00 PM
 * on the same date with the same operator (QA, Aug 2026) — one crew, three cars,
 * one hour. A booked hour has to leave the open list and come back as taken, so
 * the calendar can grey it out instead of selling it again.
 */

import { buildAvailabilityDays, type BookingRow } from '../lib/availability';

let failures = 0;
function check(name: string, cond: boolean) {
  if (!cond) {
    console.error(`FAIL: ${name}`);
    failures++;
  }
}

// Friday 2026-08-07 and Saturday 2026-08-08, 8am–7pm — the shape of the QA case.
const DATES = ['2026-08-07', '2026-08-08'];
const HOURS = {
  Fri: { open: '08:00', close: '19:00' },
  Sat: { open: '08:00', close: '19:00' },
};

function days(bookings: BookingRow[], over: Partial<Parameters<typeof buildAvailabilityDays>[0]> = {}) {
  return buildAvailabilityDays({
    dates: DATES,
    bookings,
    agreedDates: new Set<string>(),
    managerDay: null,
    hours: HOURS,
    capacity: 20,
    isPartnerOperator: false,
    ...over,
  });
}

function main() {
  // ── a booked hour is no longer for sale ─────────────────────────────────
  const [friday, saturday] = days([{ scheduled_for: '2026-08-07', time_slot: '1:00 PM' }]);
  check('a booked hour leaves the open list', !friday.slots.includes('1:00 PM'));
  check('a booked hour is reported as taken', friday.taken.includes('1:00 PM'));
  check('the rest of the day stays open', friday.slots.includes('12:00 PM') && friday.slots.includes('2:00 PM'));
  check('a booking on one date does not close the same hour on another', saturday.slots.includes('1:00 PM'));

  // The exact QA case: three bookings stacked on one hour, and the day is not
  // otherwise busy — only that hour goes.
  const stacked = days([
    { scheduled_for: '2026-08-07', time_slot: '1:00 PM' },
    { scheduled_for: '2026-08-07', time_slot: '1:00 PM' },
    { scheduled_for: '2026-08-07', time_slot: '1:00 PM' },
  ])[0];
  check('duplicates on one hour close that hour once', stacked.taken.filter((t) => t === '1:00 PM').length === 1);
  check('duplicates on one hour do not close the day', stacked.slots.length === 10 && !stacked.full);

  // ── written any way, it still occupies the hour it holds ────────────────
  check(
    'a 24-hour time_slot closes the matching hour',
    days([{ scheduled_for: '2026-08-07', time_slot: '13:00' }])[0].taken.includes('1:00 PM'),
  );
  check(
    'stray case and spacing still match',
    days([{ scheduled_for: '2026-08-07', time_slot: ' 1:00 pm ' }])[0].taken.includes('1:00 PM'),
  );
  check(
    'a booking with no time holds no hour',
    days([{ scheduled_for: '2026-08-07', time_slot: null }])[0].taken.length === 0,
  );

  // ── a day with every hour spoken for reads as full ──────────────────────
  const allHours = Array.from({ length: 11 }).map((_, i) => ({
    scheduled_for: '2026-08-07',
    time_slot: `${((8 + i - 1) % 12) + 1}:00 ${8 + i < 12 ? 'AM' : 'PM'}`,
  }));
  const booked = days(allHours)[0];
  check('every hour taken leaves nothing open', booked.slots.length === 0);
  check('every hour taken reads as full', booked.full);

  // ── day capacity still wins ─────────────────────────────────────────────
  const capped = days([{ scheduled_for: '2026-08-07', time_slot: '9:00 AM' }], { capacity: 1 })[0];
  check('a day at capacity offers no hours at all', capped.slots.length === 0 && capped.taken.length === 0);
  check('a day at capacity is full', capped.full);

  // ── a day the operator does not serve is unchanged ──────────────────────
  const closed = days([], { hours: { ...HOURS, Fri: { closed: true } } })[0];
  check('a closed day offers nothing and is not called full', closed.slots.length === 0 && !closed.full);

  if (failures) {
    console.error(`\n${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log('slot availability: all checks passed');
}

main();
