/**
 * Regression guard for the resident's wash history.
 * Run: npx tsx --tsconfig tsconfig.scripts.json scripts/wash-history-test.ts
 *
 * The bug this exists to prevent: /resident/washes listed every `washes` row it
 * could find, and a row is created as soon as a resident is rostered onto a
 * wash day. A resident whose only wash was still four days out saw that wash
 * under "Wash history" as "scheduled" — the very wash the card above it had
 * just announced as upcoming (QA, Aug 2026) — and lost the first-wash welcome
 * copy, which only shows when there is no history. History has to mean washes
 * that already happened, labelled by what actually happened to them.
 */

import { isPastWash, washDate, washHistory, washOutcome } from '../lib/wash-history';

const TODAY = '2026-08-03';

let failures = 0;
function check(name: string, cond: boolean) {
  if (!cond) {
    console.error(`FAIL: ${name}`);
    failures++;
  }
}

const wash = (
  status: string,
  scheduledFor: string | null,
  completedAt: string | null = null,
  washDayId = `wd-${scheduledFor}`
) => ({
  id: `w-${status}-${scheduledFor}`,
  status,
  completed_at: completedAt,
  wash_day_id: washDayId,
  wash_day: scheduledFor ? { scheduled_for: scheduledFor } : null,
});

function main() {
  // ── the QA case: the next wash is not history ───────────────────────────
  const upcoming = wash('scheduled', '2026-08-07');
  check('a future scheduled wash is not history', !isPastWash(upcoming, TODAY));
  check('a resident with only an upcoming wash has an empty history',
    washHistory([upcoming], TODAY, 20).length === 0);

  // ── today is still in play ──────────────────────────────────────────────
  check("today's scheduled wash is not history", !isPastWash(wash('scheduled', TODAY), TODAY));
  check("today's in-progress wash is not history", !isPastWash(wash('in_progress', TODAY), TODAY));
  check("today's finished wash is history",
    isPastWash(wash('completed', TODAY, `${TODAY}T15:00:00Z`), TODAY));

  // ── what did happen shows up ────────────────────────────────────────────
  check('a completed wash is history', isPastWash(wash('completed', '2026-07-31', '2026-07-31T15:00:00Z'), TODAY));
  check('a flagged wash is history', isPastWash(wash('flagged', '2026-07-24'), TODAY));
  check('a past wash the crew never marked is history', isPastWash(wash('scheduled', '2026-07-17'), TODAY));

  // ── ordering: newest first, by wash day, not by completed_at ────────────
  const ordered = washHistory(
    [
      wash('scheduled', '2026-07-17'), // no completed_at at all
      wash('completed', '2026-06-19', '2026-06-19T14:00:00Z'),
      wash('completed', '2026-07-31', '2026-07-31T15:00:00Z'),
      wash('scheduled', '2026-08-07'), // upcoming, must be dropped
    ],
    TODAY,
    20
  );
  check('history holds only the past washes', ordered.length === 3);
  check('history runs newest first',
    ordered.map((w) => washDate(w)).join(',') === '2026-07-31,2026-07-17,2026-06-19');
  check('an unrecorded past wash is not sorted to the bottom', washDate(ordered[1]) === '2026-07-17');

  // ── the limit keeps the most recent washes ──────────────────────────────
  const many = Array.from({ length: 30 }, (_, i) =>
    wash('completed', `2026-0${1 + Math.floor(i / 28)}-${String((i % 28) + 1).padStart(2, '0')}`)
  );
  const capped = washHistory(many, TODAY, 20);
  check('the limit caps the list', capped.length === 20);
  check('the limit drops the oldest, not the newest', washDate(capped[0]) === washDate(washHistory(many, TODAY, 30)[0]));

  check('no washes at all is an empty history', washHistory(null, TODAY, 20).length === 0);

  // ── labels say what happened ────────────────────────────────────────────
  check('a completed wash reads as completed', washOutcome(wash('completed', '2026-07-31')) === 'completed');
  check('a flagged wash reads as flagged', washOutcome(wash('flagged', '2026-07-24')) === 'flagged');
  check('a past wash the resident skipped reads as skipped',
    washOutcome(wash('scheduled', '2026-07-17'), true) === 'skipped');
  check('a past wash nobody recorded does not claim to be scheduled',
    washOutcome(wash('scheduled', '2026-07-17')) === 'not recorded');
  check('a skip does not override a wash that actually happened',
    washOutcome(wash('completed', '2026-07-31'), true) === 'completed');

  // ── a wash whose wash day is gone falls back to when it was done ────────
  const orphan = { status: 'completed', completed_at: '2026-07-10T16:00:00Z', wash_day: null };
  check('a wash without a wash day is dated by completion', washDate(orphan) === '2026-07-10');
  check('a wash without a wash day is still history', isPastWash(orphan, TODAY));

  if (failures) {
    console.error(`\n${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log('wash history: all checks passed');
}

main();
