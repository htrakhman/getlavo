/**
 * Regression tests for lib/wash-day-minimum.
 * Run: npx tsx scripts/wash-day-minimum-test.ts
 */
import assert from 'node:assert';
import {
  decideWashDay,
  cutoffAt,
  normalizeMinimum,
  shortfallLabel,
  MINIMUM_CUTOFF_HOURS,
  MAX_MINIMUM,
} from '../lib/wash-day-minimum';

const DAY = '2026-10-15';
// 48h before 2026-10-15T00:00:00Z
const cutoff = new Date('2026-10-13T00:00:00Z');
const beforeCutoff = new Date('2026-10-12T23:00:00Z');
const afterCutoff = new Date('2026-10-13T01:00:00Z');

// --- cutoff maths -----------------------------------------------------------
assert.equal(cutoffAt(DAY)?.toISOString(), cutoff.toISOString(), 'cutoff is 48h before midnight');
assert.equal(cutoffAt(null), null, 'no date, no cutoff');
assert.equal(cutoffAt('not-a-date'), null, 'unparseable date yields null');
assert.equal(MINIMUM_CUTOFF_HOURS, 48);

// --- no minimum configured --------------------------------------------------
assert.equal(
  decideWashDay({ scheduledFor: DAY, booked: 0, minimum: 0, now: afterCutoff }).verdict,
  'runs',
  'zero minimum never cancels a day',
);
assert.equal(
  decideWashDay({ scheduledFor: DAY, booked: 0, minimum: null, now: afterCutoff }).verdict,
  'runs',
  'null minimum never cancels a day',
);

// --- threshold met ----------------------------------------------------------
assert.equal(
  decideWashDay({ scheduledFor: DAY, booked: 4, minimum: 4, now: afterCutoff }).verdict,
  'runs',
  'exactly the minimum runs',
);
assert.equal(
  decideWashDay({ scheduledFor: DAY, booked: 9, minimum: 4, now: beforeCutoff }).verdict,
  'runs',
  'over the minimum runs',
);

// --- short of threshold -----------------------------------------------------
const waiting = decideWashDay({ scheduledFor: DAY, booked: 1, minimum: 4, now: beforeCutoff });
assert.equal(waiting.verdict, 'waiting', 'short but before cutoff waits');
assert.equal(waiting.verdict === 'waiting' && waiting.short, 3, 'reports the shortfall');

const cancel = decideWashDay({ scheduledFor: DAY, booked: 1, minimum: 4, now: afterCutoff });
assert.equal(cancel.verdict, 'cancel', 'short and past cutoff cancels');
assert.equal(cancel.verdict === 'cancel' && cancel.short, 3, 'reports the shortfall');

// The boundary belongs to the cancel side: at the cutoff the answer is settled.
assert.equal(
  decideWashDay({ scheduledFor: DAY, booked: 1, minimum: 4, now: cutoff }).verdict,
  'cancel',
  'exactly at the cutoff cancels',
);

// --- an unreadable date must never cancel someone's wash --------------------
assert.equal(
  decideWashDay({ scheduledFor: 'garbage', booked: 0, minimum: 5, now: afterCutoff }).verdict,
  'waiting',
  'unparseable date never cancels',
);

// --- input hardening --------------------------------------------------------
assert.equal(
  decideWashDay({ scheduledFor: DAY, booked: -3, minimum: 2, now: afterCutoff }).booked,
  0,
  'negative booking counts floor at zero',
);
assert.equal(normalizeMinimum('4'), 4, 'parses a numeric string');
assert.equal(normalizeMinimum(''), 0, 'blank means no minimum');
assert.equal(normalizeMinimum('abc'), 0, 'garbage means no minimum');
assert.equal(normalizeMinimum(-2), 0, 'negatives mean no minimum');
assert.equal(normalizeMinimum(999), MAX_MINIMUM, 'clamped to a reachable maximum');
assert.equal(normalizeMinimum(3.7), 3, 'truncated to whole cars');

// --- copy -------------------------------------------------------------------
assert.equal(shortfallLabel(1), '1 more booking needed', 'singular');
assert.equal(shortfallLabel(3), '3 more bookings needed', 'plural');
assert.equal(shortfallLabel(0), '', 'nothing to say when met');

console.log('wash-day-minimum: all assertions passed');
