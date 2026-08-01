/**
 * Regression guard for standard-wash pricing.
 * Run: npx tsx --tsconfig tsconfig.scripts.json scripts/wash-pricing-test.ts
 *
 * The bug this exists to prevent: the operator's base price used to track the
 * cheapest active service package, so adding a $1.00 test package repriced the
 * standard wash to $1.00 in every partnered building at once (QA, Aug 2026).
 * The rate a building signed for has to survive whatever the operator later
 * does to their menu, and the quote on the booking form has to equal the amount
 * charged — both invariants are checked below.
 */

import { resolveStandardWashPricing, washCentsFor } from '../lib/wash-pricing';

let failures = 0;
function check(name: string, cond: boolean) {
  if (!cond) {
    console.error(`FAIL: ${name}`);
    failures++;
  }
}

const OP = { base_price_cents: 3500, open_slot_price_cents: 4500 };

function main() {
  // ── the building's signed rate wins ─────────────────────────────────────
  const contracted = resolveStandardWashPricing(OP, 7000);
  check('an executed contract sets the building-day price', contracted.buildingDayCents === 7000);
  check('a contracted price is flagged as such', contracted.fromContract);

  // The exact regression: a $1 package on the menu must not reach the wash price.
  const clobbered = resolveStandardWashPricing({ base_price_cents: 100, open_slot_price_cents: null }, 7000);
  check('a cheap menu item cannot undercut the contracted rate', clobbered.buildingDayCents === 7000);

  // ── no contract: the operator's own rate stands ─────────────────────────
  const uncontracted = resolveStandardWashPricing(OP, null);
  check('without a contract the profile base price applies', uncontracted.buildingDayCents === 3500);
  check('a profile price is not flagged as contracted', !uncontracted.fromContract);

  // A null or zero contract price is a pre-0048 row, not a free wash.
  check('a zero contract price falls back to the profile rate', resolveStandardWashPricing(OP, 0).buildingDayCents === 3500);
  check('a missing profile price reads as 0, never NaN', resolveStandardWashPricing({}, null).buildingDayCents === 0);

  // ── on-demand stays the operator's own rate ─────────────────────────────
  check('the on-demand rate comes from the operator', contracted.openSlotCents === 4500);
  check(
    'no on-demand rate published stays null, so the booking type toggle stays hidden',
    resolveStandardWashPricing({ base_price_cents: 3500 }, null).openSlotCents === null,
  );

  // ── what a booking actually rings up at ─────────────────────────────────
  check('a building-day booking charges the contracted rate', washCentsFor(contracted, 'building_day') === 7000);
  check('an on-demand booking charges the on-demand rate', washCentsFor(contracted, 'open_slot') === 4500);
  check(
    'an operator with no on-demand rate charges their building-day price either way',
    washCentsFor(resolveStandardWashPricing({ base_price_cents: 3500 }, null), 'open_slot') === 3500,
  );

  if (failures) {
    console.error(`\n${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log('wash pricing: all checks passed');
}

main();
