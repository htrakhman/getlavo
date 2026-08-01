/**
 * Regression guard for the consolidated marketplace pricing summary.
 * Run: npx tsx --tsconfig tsconfig.scripts.json scripts/operator-pricing-test.ts
 *
 * The marketplace card now leads with a price range instead of the building-day
 * rate, so a wrong range misprices an operator on the one screen a manager uses
 * to choose one. The invariants below cover the shapes real rows arrive in:
 * size-tier pricing, legacy `xl` tiers, draft rows with no price, and operators
 * who haven't published a menu at all.
 */

import { operatorPricing, rangeLabel, menuSummary, dollars } from '../lib/operator-pricing';

let failures = 0;
function check(name: string, cond: boolean) {
  if (!cond) {
    console.error(`FAIL: ${name}`);
    failures++;
  }
}

const OP = { base_price_cents: 7000, open_slot_price_cents: 9500 };

const PACKAGES = [
  {
    id: 'p1',
    operator_id: 'op1',
    name: 'Express Wash',
    description: 'Exterior only',
    price_cents: 4500,
    size_prices: [
      { size: 'sedan', price_cents: 4500 },
      { size: 'truck', price_cents: 6500 },
    ],
  },
  { id: 'p2', operator_id: 'op1', name: 'Full Detail', description: null, price_cents: 18000, size_prices: [] },
  // Another operator's row: must never leak into op1's menu.
  { id: 'p3', operator_id: 'op2', name: 'Someone else', description: null, price_cents: 99900, size_prices: [] },
];

const ADDONS = [
  { id: 'a1', operator_id: 'op1', label: 'Pet hair removal', price_cents: 3000, size_prices: [] },
  { id: 'a2', operator_id: 'op2', label: 'Not ours', price_cents: 100, size_prices: [] },
];

function main() {
  const p = operatorPricing('op1', OP, PACKAGES as any, ADDONS as any);

  // ── scoping ─────────────────────────────────────────────────────────────
  check('only this operator\'s packages are included', p.packages.length === 2);
  check('only this operator\'s add-ons are included', p.addons.length === 1);
  check('base rate carries through', p.basePriceCents === 7000);
  check('on-demand rate carries through', p.openSlotPriceCents === 9500);

  // ── range spans vehicle tiers, not just the "from" price ────────────────
  check('range low is the cheapest tier', p.range?.minCents === 4500);
  check('range high is the priciest package', p.range?.maxCents === 18000);
  check('range renders as whole dollars', rangeLabel(p) === '$45–$180');

  // A top tier above every package's base price still has to raise the ceiling.
  const tierTop = operatorPricing(
    'op1',
    OP,
    [{ id: 'p1', operator_id: 'op1', name: 'Wash', price_cents: 4500, size_prices: [{ size: 'truck', price_cents: 22000 }] }] as any,
    [],
  );
  check('a tier price above every base price raises the ceiling', tierTop.range?.maxCents === 22000);

  // ── legacy `xl` tier rows stay readable (migration 0049 stragglers) ──────
  const legacy = operatorPricing(
    'op1',
    OP,
    [{ id: 'p1', operator_id: 'op1', name: 'Wash', price_cents: 5000, size_prices: [{ size: 'xl', price_cents: 9000 }] }] as any,
    [],
  );
  check('legacy xl tier still counts toward the range', legacy.range?.maxCents === 9000);

  // ── draft and malformed rows ────────────────────────────────────────────
  const drafts = operatorPricing(
    'op1',
    OP,
    [
      { id: 'p1', operator_id: 'op1', name: 'Unpriced draft', price_cents: 0, size_prices: [] },
      { id: 'p2', operator_id: 'op1', name: 'Null price', price_cents: null, size_prices: [] },
      { id: 'p3', operator_id: 'op1', name: 'Tier only', price_cents: null, size_prices: [{ size: 'suv', price_cents: 8000 }] },
    ] as any,
    [],
  );
  check('a $0 package is dropped, not advertised as free', !drafts.packages.some((i) => i.label === 'Unpriced draft'));
  check('a null-price package with no tiers is dropped', !drafts.packages.some((i) => i.label === 'Null price'));
  check('a tier-only package prices from its cheapest tier', drafts.packages[0]?.fromCents === 8000);

  // ── no menu at all: fall back to the building-day rate, never blank ──────
  const bare = operatorPricing('op1', OP, [], []);
  check('an operator with no menu has no range', bare.range === null);
  check('an empty menu falls back to the building-day rate', rangeLabel(bare) === '$70');
  check('a priceless operator renders a dash, not $NaN', rangeLabel(operatorPricing('op1', {}, [], [])) === '—');

  // ── labels ──────────────────────────────────────────────────────────────
  check('summary counts both menus', menuSummary(p) === '2 packages · 1 add-on');
  check('summary omits an empty section', menuSummary(bare) === '');
  check('a single-price menu renders one figure', rangeLabel(operatorPricing(
    'op1', OP, [{ id: 'p1', operator_id: 'op1', name: 'Wash', price_cents: 5000, size_prices: [] }] as any, [],
  )) === '$50');
  check('dollars rounds to the nearest whole', dollars(4550) === '$46');

  // ── ordering: cheapest first, so the panel reads like a menu ─────────────
  check('packages are sorted cheapest first', p.packages[0].label === 'Express Wash');

  if (failures) {
    console.error(`\n${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log('operator pricing: all checks passed');
}

main();
