/**
 * Regression guard for vehicle-type pricing.
 * Run: npx tsx --tsconfig tsconfig.scripts.json scripts/vehicle-size-pricing-test.ts
 *
 * An operator prices a package (and an add-on) per vehicle tier; the resident's
 * vehicle carries the tier. `priceForVehicle` is where those two meet, and it
 * is the single resolution used by the booking form, the checkout route and the
 * per-wash charge — so a wrong answer here is a wrong number on the receipt,
 * not just on a screen. The cases below are the shapes real rows arrive in:
 * flat pricing, exact tiers, gaps in the operator's tiers, legacy tier names
 * from the four-tier window of migration 0049, and a vehicle that hasn't
 * answered yet.
 */

import { priceForVehicle, parseSizePrices, normalizeSize } from '../lib/vehicle-sizes';

let failures = 0;
function check(name: string, cond: boolean) {
  if (!cond) {
    console.error(`FAIL: ${name}`);
    failures++;
  }
}

const FULL = {
  price_cents: 4500,
  size_prices: [
    { size: 'sedan', price_cents: 4500 },
    { size: 'suv', price_cents: 5500 },
    { size: 'xl', price_cents: 6500 },
  ],
};

// A real menu shape: the operator priced the ends and left the middle alone.
const GAPPED = {
  price_cents: 4500,
  size_prices: [
    { size: 'sedan', price_cents: 4500 },
    { size: 'xl', price_cents: 8000 },
  ],
};

const FLAT = { price_cents: 7000, size_prices: [] };

function main() {
  // ── the ordinary case: the tier for the vehicle ────────────────────────
  check('sedan pays the sedan tier', priceForVehicle(FULL, 'sedan') === 4500);
  check('suv pays the suv tier', priceForVehicle(FULL, 'suv') === 5500);
  check('xl pays the xl tier', priceForVehicle(FULL, 'xl') === 6500);

  // ── flat pricing ignores the vehicle entirely ──────────────────────────
  check('flat price applies to a sedan', priceForVehicle(FLAT, 'sedan') === 7000);
  check('flat price applies to an xl', priceForVehicle(FLAT, 'xl') === 7000);

  // ── a gap rounds toward the larger vehicle, never against the operator ──
  check('an suv in a sedan/xl menu takes the tier above it', priceForVehicle(GAPPED, 'suv') === 8000);
  check('a sedan in a sedan/xl menu still takes its own tier', priceForVehicle(GAPPED, 'sedan') === 4500);
  check(
    'above the top priced tier, the top tier stands',
    priceForVehicle({ price_cents: 3000, size_prices: [{ size: 'sedan', price_cents: 3000 }] }, 'xl') === 3000,
  );

  // ── an unanswered vehicle gets the advertised "from" price ─────────────
  check('unknown vehicle falls back to the lowest tier', priceForVehicle(FULL, null) === 4500);
  check('unknown vehicle on a flat row gets the flat price', priceForVehicle(FLAT, null) === 7000);
  check(
    'the "from" price is the cheapest tier, not the stored base',
    // A stale base above every tier must not be quoted — the tiers are the menu.
    priceForVehicle({ price_cents: 9900, size_prices: [{ size: 'suv', price_cents: 5000 }] }, null) === 5000,
  );

  // ── legacy tier names from the four-tier window (migration 0049) ───────
  check(
    'a `truck` tier is read as xl',
    priceForVehicle({ price_cents: 5000, size_prices: [{ size: 'truck', price_cents: 9000 }] }, 'xl') === 9000,
  );
  check('a legacy vehicle size normalizes to xl', normalizeSize('three_row') === 'xl');
  check('an unknown vehicle size is treated as unanswered', normalizeSize('motorcycle') === null);
  check('a null vehicle size is unanswered', normalizeSize(null) === null);

  // ── malformed rows can never crash a quote ─────────────────────────────
  check('no size_prices at all is the base price', priceForVehicle({ price_cents: 1200 }, 'suv') === 1200);
  check('an unpriced row is zero, not NaN', priceForVehicle({ price_cents: null, size_prices: [] }, 'suv') === 0);
  check(
    'garbage tiers are dropped rather than quoted',
    priceForVehicle({ price_cents: 4000, size_prices: [{ size: 'boat', price_cents: 100 }] }, 'suv') === 4000,
  );
  check('non-array size_prices parses to nothing', parseSizePrices('nope').length === 0);

  if (failures === 0) console.log('vehicle-size pricing: all checks passed');
  process.exit(failures === 0 ? 0 : 1);
}

main();
