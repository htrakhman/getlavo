/**
 * Regression guard for the 24-hour cancellation refund window.
 * Run: npx tsx --tsconfig tsconfig.scripts.json scripts/cancellation-window-test.ts
 *
 * The bug this exists to prevent: cancelling refunded every booking, whatever
 * the notice, and the resident's email said "Refund: issued" unconditionally.
 * A wash called off an hour before the crew arrives has to leave the charge in
 * place — and, just as important, must not tell the resident money is coming.
 *
 * The window is wall-clock in America/New_York, so the cases below are pinned
 * to real UTC instants either side of both DST changes: an offset computed off
 * the wrong date is exactly what puts a booking on the wrong side of the line.
 */

import {
  REFUND_WINDOW_HOURS,
  cancellationWindow,
  isRefundableCancellation,
  refundOutcomeCopy,
  washStartsAt,
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

const at = (iso: string) => new Date(iso);

function main() {
  // ── the wash's real instant, in EDT and in EST ──────────────────────────
  // August is EDT (UTC-4): 9:00 AM ET === 13:00 UTC.
  eq('summer slot resolves to EDT', washStartsAt('2026-08-10', '9:00 AM').toISOString(), '2026-08-10T13:00:00.000Z');
  // January is EST (UTC-5): 9:00 AM ET === 14:00 UTC.
  eq('winter slot resolves to EST', washStartsAt('2026-01-12', '9:00 AM').toISOString(), '2026-01-12T14:00:00.000Z');
  eq('afternoon slot parses as PM', washStartsAt('2026-08-10', '1:00 PM').toISOString(), '2026-08-10T17:00:00.000Z');

  // A booking with no hour is treated as starting at midnight on its date, so
  // the whole wash day sits inside the window from the previous midnight on.
  eq('date-only wash starts at local midnight', washStartsAt('2026-08-10').toISOString(), '2026-08-10T04:00:00.000Z');
  eq('unparseable slot falls back to midnight', washStartsAt('2026-08-10', 'morning-ish').toISOString(), '2026-08-10T04:00:00.000Z');

  // ── the line itself ────────────────────────────────────────────────────
  const wash = { date: '2026-08-10', slot: '9:00 AM' }; // 2026-08-10T13:00Z
  eq('cutoff is one day before the wash', cancellationWindow(wash.date, wash.slot).cutoffAt.toISOString(), '2026-08-09T13:00:00.000Z');

  check('a week out is refundable', isRefundableCancellation(wash.date, wash.slot, at('2026-08-03T13:00:00Z')));
  check('25 hours out is refundable', isRefundableCancellation(wash.date, wash.slot, at('2026-08-09T12:00:00Z')));
  check('exactly 24 hours out is still refundable', isRefundableCancellation(wash.date, wash.slot, at('2026-08-09T13:00:00Z')));
  check('a minute inside the window is not', !isRefundableCancellation(wash.date, wash.slot, at('2026-08-09T13:01:00Z')));
  check('23 hours out is not', !isRefundableCancellation(wash.date, wash.slot, at('2026-08-09T14:00:00Z')));
  check('an hour before the crew arrives is not', !isRefundableCancellation(wash.date, wash.slot, at('2026-08-10T12:00:00Z')));
  check('after the wash is not', !isRefundableCancellation(wash.date, wash.slot, at('2026-08-11T00:00:00Z')));

  // ── DST: the 24 hours are wall-clock, and the offset moves inside them ──
  // Fall back, 2026-11-01: the 9:00 AM wash is EST (14:00Z); 24 hours earlier
  // is still EDT, so the cutoff is 2026-10-31T14:00Z — 10:00 AM local, not 9:00.
  eq('cutoff crossing fall-back', cancellationWindow('2026-11-01', '9:00 AM').cutoffAt.toISOString(), '2026-10-31T14:00:00.000Z');
  check('fall-back: 10:01 AM local the day before is late', !isRefundableCancellation('2026-11-01', '9:00 AM', at('2026-10-31T14:01:00Z')));
  check('fall-back: 9:59 AM local the day before is in time', isRefundableCancellation('2026-11-01', '9:00 AM', at('2026-10-31T13:59:00Z')));

  // Spring forward, 2026-03-08: the 9:00 AM wash is EDT (13:00Z); 24 hours
  // earlier is EST, so the cutoff is 8:00 AM local on the 7th.
  eq('wash on spring-forward day is EDT', washStartsAt('2026-03-08', '9:00 AM').toISOString(), '2026-03-08T13:00:00.000Z');
  eq('cutoff crossing spring-forward', cancellationWindow('2026-03-08', '9:00 AM').cutoffAt.toISOString(), '2026-03-07T13:00:00.000Z');

  // ── the copy the resident actually reads ───────────────────────────────
  check('an issued refund says money is coming', /refund is on its way/i.test(refundOutcomeCopy('issued')));
  check('a withheld refund never claims one was issued', !/on its way|issued to your/i.test(refundOutcomeCopy('withheld_late')));
  check('a withheld refund names the window', refundOutcomeCopy('withheld_late').includes(String(REFUND_WINDOW_HOURS)));

  if (failures) {
    console.error(`\n${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log('cancellation window: all checks passed');
}

main();
