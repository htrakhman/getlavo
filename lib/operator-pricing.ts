import { parseSizePrices, type SizePrice } from '@/lib/vehicle-sizes';

/**
 * One priced line on an operator's menu — a service package or an add-on.
 * `fromCents` is the starting price; `sizePrices` carries the per-vehicle-tier
 * breakdown when the operator set one (see lib/vehicle-sizes).
 */
export type PricedItem = {
  id: string;
  label: string;
  description: string | null;
  fromCents: number;
  sizePrices: SizePrice[];
};

/**
 * Everything an operator charges, in one shape. The marketplace card leads with
 * `range` (what a resident would actually pay) instead of the bare building-day
 * rate, and hands the whole object to the hover panel so a manager can compare
 * full menus without opening four profiles in four tabs.
 */
export type OperatorPricing = {
  basePriceCents: number | null;
  openSlotPriceCents: number | null;
  packages: PricedItem[];
  addons: PricedItem[];
  /** Low/high across every package price and vehicle tier. Null with no packages. */
  range: { minCents: number; maxCents: number } | null;
};

export type PricedRow = {
  id: string;
  operator_id: string;
  price_cents: number | null;
  size_prices?: unknown;
  description?: string | null;
};

function toItem(row: PricedRow, label: string): PricedItem | null {
  const sizePrices = parseSizePrices(row.size_prices);
  const base = Number.isFinite(row.price_cents) && (row.price_cents ?? 0) > 0 ? (row.price_cents as number) : null;
  // A row with neither a base price nor any tier price is an unfinished draft,
  // not a $0 service — drop it rather than advertising free work.
  if (base === null && sizePrices.length === 0) return null;
  return {
    id: row.id,
    label,
    description: row.description?.trim() || null,
    fromCents: base ?? Math.min(...sizePrices.map((s) => s.price_cents)),
    sizePrices,
  };
}

/** Every price a single item can ring up at, across its vehicle tiers. */
function itemPrices(item: PricedItem): number[] {
  return [item.fromCents, ...item.sizePrices.map((s) => s.price_cents)];
}

type OperatorRow = {
  base_price_cents?: number | null;
  open_slot_price_cents?: number | null;
};

/**
 * Fold an operator's row plus their package and add-on rows into one pricing
 * summary. Rows are pre-filtered by caller (active only) but may arrive for any
 * operator — this picks out the ones belonging to `operatorId` so a page can run
 * a single batched query for the whole listing.
 */
export function operatorPricing(
  operatorId: string,
  op: OperatorRow,
  packageRows: PricedRow[],
  addonRows: (PricedRow & { label?: string | null; name?: string | null })[],
): OperatorPricing {
  const packages = packageRows
    .filter((r) => r.operator_id === operatorId)
    .map((r) => toItem(r, ((r as any).name as string) ?? 'Package'))
    .filter((i): i is PricedItem => i !== null)
    .sort((a, b) => a.fromCents - b.fromCents);

  const addons = addonRows
    .filter((r) => r.operator_id === operatorId)
    .map((r) => toItem(r, (r.label ?? r.name ?? 'Add-on') as string))
    .filter((i): i is PricedItem => i !== null)
    .sort((a, b) => a.fromCents - b.fromCents);

  const all = packages.flatMap(itemPrices);
  return {
    basePriceCents: op.base_price_cents ?? null,
    openSlotPriceCents: op.open_slot_price_cents ?? null,
    packages,
    addons,
    range: all.length ? { minCents: Math.min(...all), maxCents: Math.max(...all) } : null,
  };
}

/** Whole-dollar rendering for the compact headline — cents are noise in a range. */
export function dollars(cents: number): string {
  return `$${Math.round(cents / 100)}`;
}

/**
 * The one line that replaces the bare base price on a marketplace card. Falls
 * back to the building-day rate when the crew hasn't published a menu yet, so
 * the card never goes blank.
 */
export function rangeLabel(p: OperatorPricing): string {
  if (!p.range) return p.basePriceCents ? dollars(p.basePriceCents) : '—';
  const { minCents, maxCents } = p.range;
  return minCents === maxCents ? dollars(minCents) : `${dollars(minCents)}–${dollars(maxCents)}`;
}

/** "6 packages · 4 add-ons" — the density signal under the headline. */
export function menuSummary(p: OperatorPricing): string {
  const parts: string[] = [];
  if (p.packages.length) parts.push(`${p.packages.length} package${p.packages.length === 1 ? '' : 's'}`);
  if (p.addons.length) parts.push(`${p.addons.length} add-on${p.addons.length === 1 ? '' : 's'}`);
  return parts.join(' · ');
}
