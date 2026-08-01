/**
 * Operators type a package description as one long run-on string — a sentence,
 * then every included step glued together with "•", then a "| Pricing: …" tail
 * they add because their menu predates per-vehicle tier pricing. Printed
 * verbatim that reads as a wall of text on the booking form.
 *
 * This splits that string back into the three things the operator actually
 * meant: an opening line, the list of what's included, and the per-vehicle
 * prices. Nothing is dropped — the pricing tail is re-rendered as its own
 * block rather than deleted, because for an operator who never filled in
 * `size_prices` it's the only place those numbers exist.
 *
 * Everything here is presentation only. The stored description is untouched,
 * so an operator still edits the same text they typed.
 */

import { type VehicleSizeId } from './vehicle-sizes';

export type PackagePricingLine = {
  label: string;
  /** Already formatted by the operator ("$70", "$85.00"); null if we can't find one. */
  price: string | null;
};

export type ParsedPackageDescription = {
  /** The opening sentence, before any bullet. Empty when the text is all bullets. */
  lead: string;
  /** What's included, one item per entry. */
  points: string[];
  /** The trailing "Pricing: …" breakdown, split per vehicle type. */
  pricing: PackagePricingLine[];
};

const EMPTY: ParsedPackageDescription = { lead: '', points: [], pricing: [] };

/** Bullet glyphs operators reach for, plus line breaks. */
const ITEM_SEPARATORS = /[•·‣▪]|\n/;

/** "| Pricing:", "Prices -", "Price:" … whatever precedes the money at the end. */
const PRICING_HEADING = /\s*\|?\s*pric(?:e|ing)s?\s*[:\-–]/gi;

/** Leading list punctuation ("- ", "– ") and trailing sentence punctuation. */
function tidyItem(s: string): string {
  return s
    .trim()
    .replace(/^[-–—*]\s*/, '')
    .replace(/[.;,]+$/, '')
    .trim();
}

/** Index of the last "Pricing:"-style heading, or -1 when there isn't one. */
function pricingHeadingIndex(text: string): { start: number; end: number } | null {
  PRICING_HEADING.lastIndex = 0;
  let found: { start: number; end: number } | null = null;
  for (let m = PRICING_HEADING.exec(text); m; m = PRICING_HEADING.exec(text)) {
    found = { start: m.index, end: m.index + m[0].length };
  }
  return found;
}

function splitPricing(tail: string): PackagePricingLine[] {
  let parts = tail.split(/[•·‣▪;\n]/);
  // "Sedan $70, SUV $80" — a comma-separated tail only counts as a list when
  // there's more than one price in it, so a lone "Sedan/Coupe, SUV $70" stays
  // one line instead of being cut in half.
  if (parts.length === 1 && (tail.match(/\$/g) ?? []).length > 1) parts = tail.split(',');

  return parts
    .map((p) => tidyItem(p))
    .filter(Boolean)
    .map((entry) => {
      const m = entry.match(/^(.*?)[\s—–-]*(\$\s?[\d,]+(?:\.\d{2})?)$/);
      if (!m || !m[1].trim()) return { label: entry, price: null };
      return { label: tidyItem(m[1]), price: m[2].replace(/\s/g, '') };
    });
}

export function parsePackageDescription(raw: string | null | undefined): ParsedPackageDescription {
  if (typeof raw !== 'string') return EMPTY;
  const text = raw.replace(/\r\n?/g, '\n').trim();
  if (!text) return EMPTY;

  // Peel off the pricing tail first, so its bullets don't land in the
  // included-with list. A tail with no money in it isn't a price breakdown —
  // leave that prose where the operator put it.
  let body = text;
  let pricing: PackagePricingLine[] = [];
  const heading = pricingHeadingIndex(text);
  if (heading) {
    const tail = text.slice(heading.end);
    if (tail.includes('$')) {
      pricing = splitPricing(tail);
      body = text.slice(0, heading.start);
    }
  }
  body = body.replace(/[|\s]+$/, '').trim();

  let chunks = body.split(ITEM_SEPARATORS).map((c) => c.trim()).filter(Boolean);

  // No bullets at all: a bare comma list ("hand wash, wheel scrub, tire shine")
  // is still a list of steps, so long as the operator wasn't writing prose —
  // sentence punctuation means it's prose and stays a paragraph.
  if (chunks.length === 1 && !/[.!?]/.test(body) && (body.match(/,/g) ?? []).length >= 2) {
    chunks = body.split(',').map((c) => c.trim()).filter(Boolean);
    return { lead: '', points: chunks.map(tidyItem).filter(Boolean), pricing };
  }

  // A description that opens straight into a bullet has no lead sentence.
  const opensWithBullet = /^[•·‣▪\-–—*]/.test(body);
  const lead = opensWithBullet ? '' : (chunks.shift() ?? '');
  const points = chunks.map(tidyItem).filter(Boolean);

  return { lead: lead.trim(), points, pricing };
}

/** Typed-out tier prices lifted off a description, keyed by tier. Strings, not
 *  cents — these are the operator's own text, not something anything can charge
 *  against. */
export type TypedTierPrices = Partial<Record<VehicleSizeId, string>>;

/**
 * How a typed pricing label maps onto the three canonical tiers. Order is the
 * whole trick, because operators name a bracket by the biggest thing in it and
 * the words overlap: "3-Row SUV/Minivan/Pickup" says SUV, "SUV/Small Pickup"
 * says pickup, and only one of them is the top tier. Size qualifiers are read
 * first, then the body style, then the big-vehicle words — so "3-Row SUV" and
 * "Large SUV" land on `xl` while "Small SUV" and a bare "SUV" stay on `suv`.
 */
const TIER_PATTERNS: { size: VehicleSizeId; re: RegExp }[] = [
  { size: 'xl', re: /\b(3\s*-?\s*row|three\s*-?\s*row|third\s*row|full[\s-]*size|extra[\s-]*large|x-?large|xl|large|oversize\w*)\b/ },
  { size: 'sedan', re: /\b(sedans?|coupes?|compact|hatchback|cars?)\b/ },
  { size: 'suv', re: /\b(suv|crossover|cuv|wagon|jeep)\b/ },
  { size: 'xl', re: /\b(pickup|truck|minivan|van|3rd\s*row)\b/ },
];

/**
 * Which tier a typed pricing label names, or null when it names none.
 *
 * Read the leading segment first — an operator writes the bracket's own name
 * ahead of the slash and the examples after it ("SUV/Small Pickup"), so the
 * segment before the first "/" or "," is the authoritative one. Only when that
 * says nothing do we fall back to the whole label.
 */
export function tierFromLabel(label: string): VehicleSizeId | null {
  const full = label.toLowerCase();
  const head = full.split(/[/,]/)[0].trim();
  for (const text of [head, full]) {
    if (!text) continue;
    const hit = TIER_PATTERNS.find((p) => p.re.test(text));
    if (hit) return hit.size;
  }
  return null;
}

/**
 * Split a typed pricing tail into the lines that name a vehicle tier and the
 * lines that don't.
 *
 * The tier lines belong on the tier row next to the vehicle icons, where they
 * read as the same thing as a package that has real `size_prices` — an operator
 * who typed their brackets into the description shouldn't leave the resident
 * staring at three em dashes with the numbers stranded in a footnote below.
 * Anything else in that tail ("Add ceramic $30") is not a bracket and stays in
 * the description, because dropping it would lose text the operator wrote.
 *
 * First line wins a tier: two labels can collide once the synonyms fold in, and
 * a repeat is more likely to be a stray line than a correction.
 */
export function splitTierPricing(pricing: PackagePricingLine[]): {
  tiers: TypedTierPrices;
  rest: PackagePricingLine[];
} {
  const tiers: TypedTierPrices = {};
  const rest: PackagePricingLine[] = [];
  for (const line of pricing) {
    // A label with no price can't fill a tier — there'd be nothing to show.
    const size = line.price ? tierFromLabel(line.label) : null;
    if (!size || tiers[size]) rest.push(line);
    else tiers[size] = line.price as string;
  }
  return { tiers, rest };
}

/** The tier prices an operator typed into a description, ready for the tier row. */
export function typedTierPrices(text: string | null | undefined): TypedTierPrices {
  return splitTierPricing(parsePackageDescription(text).pricing).tiers;
}
