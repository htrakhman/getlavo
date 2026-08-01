/**
 * Regression guard for package-description formatting.
 * Run: npx tsx --tsconfig tsconfig.scripts.json scripts/package-description-test.ts
 *
 * The bug this exists to prevent: operators type their menu as one run-on
 * string — "sentence • step • step • … | Pricing: Sedan $70 • SUV $80" — and
 * every surface printed it verbatim, so the booking form showed a paragraph
 * nobody reads (QA, Aug 2026). The parser has to split that back apart without
 * ever losing text: the prices an operator typed are the only prices on the
 * card when they never filled in size_prices, and a plain prose description
 * must survive untouched.
 */

import { parsePackageDescription, splitTierPricing, tierFromLabel, typedTierPrices } from '../lib/package-description';

let failures = 0;
function check(name: string, cond: boolean) {
  if (!cond) {
    console.error(`FAIL: ${name}`);
    failures++;
  }
}

const REAL = [
  'A safe hand wash designed to maintain your vehicle\'s appearance.',
  '• Foam bath pre-soak • Hand wash using pH-neutral soap • Premium microfiber hand dry',
  '• Choice of spray wax, hand wax or machine-applied wax • Wheels & tires cleaned • Tire shine applied.',
  '| Pricing: Sedan/Coupe $70 • SUV/Small Pickup $80 • 3-Row SUV/Minivan/Pickup $85.',
].join(' ');

function main() {
  // ── the shape operators actually type ───────────────────────────────────
  const parsed = parsePackageDescription(REAL);
  check('the opening sentence becomes the lead', parsed.lead === 'A safe hand wash designed to maintain your vehicle\'s appearance.');
  check('every bulleted step becomes its own point', parsed.points.length === 6);
  check('the first step keeps its text', parsed.points[0] === 'Foam bath pre-soak');
  check('a trailing period is trimmed off a step', parsed.points[5] === 'Tire shine applied');
  check('no step carries the pricing tail', parsed.points.every((p) => !p.includes('$')));

  check('the pricing tail splits per vehicle type', parsed.pricing.length === 3);
  check('a tier keeps its label', parsed.pricing[0].label === 'Sedan/Coupe');
  check('a tier keeps its price', parsed.pricing[0].price === '$70');
  check('the last tier loses its trailing period, not its price', parsed.pricing[2].price === '$85');
  check('a multi-word tier label survives', parsed.pricing[2].label === '3-Row SUV/Minivan/Pickup');

  // Nothing may be silently dropped — every word of the original has to land
  // in one of the three buckets.
  const rendered = [parsed.lead, ...parsed.points, ...parsed.pricing.map((p) => `${p.label} ${p.price}`)].join(' ');
  for (const word of ['Foam', 'pH-neutral', 'microfiber', 'machine-applied', 'Minivan', '$80']) {
    check(`"${word}" survives the split`, rendered.includes(word));
  }

  // ── plain prose stays prose ─────────────────────────────────────────────
  const prose = parsePackageDescription('Perfect for maintaining a clean and refreshed interior.');
  check('a one-sentence description stays one paragraph', prose.lead === 'Perfect for maintaining a clean and refreshed interior.');
  check('prose produces no bullets', prose.points.length === 0);

  // ── line breaks are bullets too ─────────────────────────────────────────
  const typed = parsePackageDescription('Our best-value package.\nInterior vacuum\nHand wash\nTire shine');
  check('a newline list becomes points', typed.points.length === 3 && typed.lead === 'Our best-value package.');

  // A bare comma list is a list of steps, not a sentence.
  const commas = parsePackageDescription('Hand wash exterior, wheel scrub, tire shine, windows');
  check('a comma-separated feature list becomes points', commas.points.length === 4);
  check('a comma list has no lead sentence to invent', commas.lead === '');
  // …but a sentence with commas in it is still a sentence.
  const sentence = parsePackageDescription('A quick, careful wash for sedans, coupes and small SUVs.');
  check('a comma-laden sentence is left alone', sentence.lead.startsWith('A quick, careful wash') && sentence.points.length === 0);

  // ── descriptions that open straight into a bullet ───────────────────────
  const bulletFirst = parsePackageDescription('• Foam bath • Hand wash • Tire shine');
  check('no lead is faked from the first bullet', bulletFirst.lead === '');
  check('every leading bullet is a point', bulletFirst.points.length === 3);

  // ── the pricing heading, in the shapes it shows up in ───────────────────
  check('"Price:" reads as a pricing tail', parsePackageDescription('Wash. Price: Sedan $40').pricing.length === 1);
  check('"Prices -" reads as a pricing tail', parsePackageDescription('Wash. Prices - Sedan $40, SUV $50').pricing.length === 2);
  const priceless = parsePackageDescription('Wash. Pricing: ask your operator');
  check('a pricing note with no money stays in the description', priceless.pricing.length === 0);
  check('…and is not deleted from the text', priceless.lead.includes('ask your operator'));
  const unlabeled = parsePackageDescription('Wash. Pricing: $70 flat');
  check('a tier with no parsable price still shows its text', unlabeled.pricing[0].label === '$70 flat');

  // ── typed prices land on the vehicle tier row ───────────────────────────
  // A package priced in prose has to end up looking like a package priced in
  // size_prices: icons with numbers, not icons with em dashes and the numbers
  // stranded in a block underneath (QA, Aug 2026).
  const tiers = typedTierPrices(REAL);
  check('a typed sedan price lands on the sedan tier', tiers.sedan === '$70');
  check('a typed SUV price lands on the SUV tier', tiers.suv === '$80');
  check('a typed 3-row price lands on the xl tier', tiers.xl === '$85');

  // The labels overlap on purpose — the bracket is named by the biggest thing
  // in it, so "SUV/Small Pickup" is not the pickup tier and "3-Row SUV" is not
  // the SUV tier. The leading segment decides.
  const LABELS: [string, string | null][] = [
    ['Sedan/Coupe', 'sedan'],
    ['Sedan', 'sedan'],
    ['Coupes', 'sedan'],
    ['SUV/Small Pickup', 'suv'],
    ['Small SUV', 'suv'],
    ['Crossover', 'suv'],
    ['3-Row SUV/Minivan/Pickup', 'xl'],
    ['3 Row', 'xl'],
    ['Large SUV', 'xl'],
    ['Truck', 'xl'],
    ['Minivan', 'xl'],
    ['Full-size pickup', 'xl'],
    ['Ceramic coating', null],
    ['Add pet hair removal', null],
  ];
  for (const [label, expected] of LABELS) {
    check(`"${label}" reads as ${expected ?? 'no tier'}`, tierFromLabel(label) === (expected as any));
  }

  // A tail that isn't a bracket has nowhere else to go, so it stays in the
  // description rather than being swallowed by the tier row.
  const mixed = parsePackageDescription('Wash. Pricing: Sedan $70 • SUV $80 • Add ceramic $30');
  const split = splitTierPricing(mixed.pricing);
  check('bracket lines are lifted out of the description', split.rest.length === 1);
  check('…and the non-bracket line is the one left behind', split.rest[0].label === 'Add ceramic');
  check('the xl tier stays empty when nothing names it', split.tiers.xl === undefined);

  // A label with no price can't fill a tier — there'd be nothing to draw.
  const noPrice = splitTierPricing([{ label: 'Sedan', price: null }]);
  check('a priceless tier label fills no tier', noPrice.tiers.sedan === undefined);
  check('…and is kept in the description', noPrice.rest.length === 1);

  // Two labels can fold onto one tier; the first wins and the second is kept
  // rather than silently overwriting it.
  const dupe = splitTierPricing([
    { label: 'Sedan', price: '$70' },
    { label: 'Coupe', price: '$75' },
  ]);
  check('the first line to claim a tier keeps it', dupe.tiers.sedan === '$70');
  check('…and the runner-up is not dropped', dupe.rest.length === 1);

  check('a description with no prices fills no tiers', Object.keys(typedTierPrices('Just a wash.')).length === 0);
  check('no description fills no tiers', Object.keys(typedTierPrices(null)).length === 0);

  // ── nothing in, nothing out ─────────────────────────────────────────────
  for (const empty of [null, undefined, '', '   ']) {
    const p = parsePackageDescription(empty as any);
    check(`"${String(empty)}" renders nothing`, !p.lead && !p.points.length && !p.pricing.length);
  }

  if (failures) {
    console.error(`\n${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log('package description: all checks passed');
}

main();
