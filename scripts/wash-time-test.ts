/**
 * Regression guard for shared wash-time reading.
 * Run: npx tsx --tsconfig tsconfig.scripts.json scripts/wash-time-test.ts
 *
 * The bug this exists to prevent: `time_slot` was parsed by two functions that
 * disagreed. lib/ics.ts accepted "13:00 PM" and read it as 1 PM while rejecting
 * "13:00"; lib/cancellation-policy.ts did the exact opposite. A booking stored
 * as "13:00" was therefore a 1 PM wash to the refund deadline and an all-day
 * event on the crew's calendar — one column, two answers.
 *
 * So the assertions below are in pairs on purpose: whatever the parser makes of
 * a slot, the invite has to build the same hour out of it.
 */

import { WASH_TZ, formatInZone, parseSlotHour, zonedWallClockToUtc } from '../lib/wash-time';
import { buildIcs } from '../lib/ics';

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
eq('midnight in 24-hour form parses', String(parseSlotHour('00:00')), '0,0');
eq('empty slot is null', parseSlotHour(''), null);
eq('null slot is null', parseSlotHour(null), null);
eq('undefined slot is null', parseSlotHour(undefined), null);
eq('garbage is null', parseSlotHour('sometime'), null);
eq('13:00 PM is not a time', parseSlotHour('13:00 PM'), null);
eq('0:00 AM is not a time', parseSlotHour('0:00 AM'), null);
eq('a 60th minute is not a time', parseSlotHour('9:60 AM'), null);
eq('a 24th hour is not a time', parseSlotHour('24:00'), null);

// ── One reading, two consumers ──────────────────────────────────────────────
// Each pair: what the parser says, and what the invite builds from the same
// string. The old split let these two answers drift apart.
const slotStart = (slot: string | null) => {
  const line = buildIcs({ uid: 'u', title: 't', date: '2026-08-07', time: slot })
    .split('\r\n')
    .find((l) => l.startsWith('DTSTART'));
  return line ?? '';
};

eq('a 12-hour slot builds a timed event', slotStart('1:00 PM'), `DTSTART;TZID=${WASH_TZ}:20260807T130000`);
eq('a 24-hour slot builds the same hour', slotStart('13:00'), `DTSTART;TZID=${WASH_TZ}:20260807T130000`);
check('a slotless booking is an all-day event', slotStart(null).startsWith('DTSTART;VALUE=DATE:'));
// "13:00 PM" is not a time in either module now. It used to land on the
// calendar as 1 PM while the refund window read it as no time at all.
check('an impossible slot is an all-day event', slotStart('13:00 PM').startsWith('DTSTART;VALUE=DATE:'));

// ── Wall clock → instant, across DST ────────────────────────────────────────
// Aug 2026 is EDT (UTC-4); Jan 2026 is EST (UTC-5).
eq('summer wall clock is EDT', zonedWallClockToUtc(2026, 8, 7, 13, 0).toISOString(), '2026-08-07T17:00:00.000Z');
eq('winter wall clock is EST', zonedWallClockToUtc(2026, 1, 15, 13, 0).toISOString(), '2026-01-15T18:00:00.000Z');
// The morning after the fall-back is EST, though the same date started in EDT.
eq('the morning after fall-back is EST', zonedWallClockToUtc(2026, 11, 1, 10, 0).toISOString(), '2026-11-01T15:00:00.000Z');
// The morning after spring-forward is EDT.
eq('the morning after spring-forward is EDT', zonedWallClockToUtc(2026, 3, 8, 10, 0).toISOString(), '2026-03-08T14:00:00.000Z');
eq('midnight resolves to the start of the local day', zonedWallClockToUtc(2026, 8, 7, 0, 0).toISOString(), '2026-08-07T04:00:00.000Z');

// ── Copy ────────────────────────────────────────────────────────────────────
eq('an instant reads back as local wall clock', formatInZone(new Date('2026-08-07T17:00:00Z')), 'Fri, Aug 7 at 1:00 PM');

if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log('wash-time: all checks passed');
