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

import { parsePackageDescription } from '../lib/package-description';

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
