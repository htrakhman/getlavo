// Canonical vehicle size tiers used for size-based pricing. Detailers price the
// same work differently by vehicle type, so a service package
// (service_packages.size_prices) and an add-on (operator_addons.size_prices)
// each carry an optional price per tier on top of their base price. Labels
// mirror the language detailers already use on their menus.

/** The tier ids, smallest first. A tuple so request validators can enum over it. */
export const VEHICLE_SIZE_IDS = ['sedan', 'suv', 'xl'] as const;

export type VehicleSizeId = (typeof VEHICLE_SIZE_IDS)[number];

export const VEHICLE_SIZES: { id: VehicleSizeId; label: string; short: string }[] = [
  { id: 'sedan', label: 'Sedan / Coupe', short: 'Sedan' },
  { id: 'suv', label: 'SUV / Small SUV', short: 'SUV' },
  { id: 'xl', label: '3-Row SUV / Pickup / Minivan', short: '3-Row / Pickup' },
];

export type SizePrice = { size: VehicleSizeId; price_cents: number };

const SIZE_ORDER: readonly VehicleSizeId[] = VEHICLE_SIZE_IDS;

// A brief four-tier version (migration 0049) split the top tier into a 3-row
// and a pickup/minivan tier. Operators price those together, so 0050 collapsed
// them back into `xl`. Read both names as `xl` so a row written during that
// window still renders its price instead of silently losing a tier.
const LEGACY_SIZES: Record<string, VehicleSizeId> = { three_row: 'xl', truck: 'xl' };

/**
 * Read any stored size value as one of the three current tiers. Exported
 * because `vehicles.size` is stored as free text and arrives from the database
 * untyped — every caller reading a vehicle's tier goes through here so a legacy
 * or malformed value degrades to "not answered" instead of throwing.
 */
export function normalizeSize(raw: unknown): VehicleSizeId | null {
  if (typeof raw !== 'string') return null;
  if ((SIZE_ORDER as string[]).includes(raw)) return raw as VehicleSizeId;
  return LEGACY_SIZES[raw] ?? null;
}

/**
 * Normalize the raw `size_prices` jsonb into a clean, tier-ordered list.
 * Tolerates nulls, unknown sizes, duplicates and non-numeric prices so a
 * malformed row can never crash a render.
 *
 * Two entries can land on the same tier once the legacy names above are
 * folded in. The higher price wins: the surviving tier has to cover the
 * biggest vehicle in it, and quoting a pickup at the 3-row rate would have the
 * operator eat the difference.
 */
export function parseSizePrices(raw: unknown): SizePrice[] {
  if (!Array.isArray(raw)) return [];
  const byTier = new Map<VehicleSizeId, number>();
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue;
    const size = normalizeSize((r as any).size);
    const cents = (r as any).price_cents;
    if (!size || !Number.isFinite(cents) || cents <= 0) continue;
    const price = Math.round(cents);
    byTier.set(size, Math.max(byTier.get(size) ?? 0, price));
  }
  return [...byTier.entries()]
    .map(([size, price_cents]) => ({ size, price_cents }))
    .sort((a, b) => SIZE_ORDER.indexOf(a.size) - SIZE_ORDER.indexOf(b.size));
}

export function sizeLabel(id: VehicleSizeId): string {
  return VEHICLE_SIZES.find((s) => s.id === id)?.label ?? id;
}

/** Lowest tier price, used as the "from" price when size pricing is set. */
export function fromPriceCents(sizePrices: SizePrice[], fallback: number): number {
  if (!sizePrices.length) return fallback;
  return Math.min(...sizePrices.map((s) => s.price_cents));
}

/** A priced menu row — a service package or an add-on — as it comes off the database. */
export type SizedPriceRow = { price_cents?: number | null; size_prices?: unknown };

/**
 * What this row costs for this vehicle: the one function every quote, checkout
 * line and charge resolves through, so the price on the booking form is the
 * price on the receipt.
 *
 * - No tier pricing on the row → its flat price, whatever the vehicle is.
 * - Unknown vehicle tier → the "from" price, which is what the menu advertised.
 *   Callers that take money require a tier first; this is the display fallback.
 * - A tier for exactly this vehicle → that price. The ordinary case.
 * - A gap in the operator's tiers (they priced sedan and 3-row but not SUV) →
 *   the next tier *up*. A tier has to cover the biggest vehicle that falls into
 *   it, so an unpriced middle bracket rounds toward the larger vehicle rather
 *   than handing an SUV the sedan rate at the operator's expense. Above the
 *   top priced tier there is nothing to round up to, so the top tier stands.
 */
export function priceForVehicle(row: SizedPriceRow, size: VehicleSizeId | null): number {
  const base = Number.isFinite(row.price_cents) && (row.price_cents ?? 0) > 0 ? (row.price_cents as number) : 0;
  const tiers = parseSizePrices(row.size_prices);
  if (!tiers.length) return base;
  if (!size) return fromPriceCents(tiers, base);

  const exact = tiers.find((t) => t.size === size);
  if (exact) return exact.price_cents;

  const wanted = SIZE_ORDER.indexOf(size);
  // parseSizePrices returns tiers in ascending size order, so the first one
  // above the vehicle is the next bracket up.
  const above = tiers.find((t) => SIZE_ORDER.indexOf(t.size) > wanted);
  return above?.price_cents ?? tiers[tiers.length - 1].price_cents;
}

/**
 * Dollar-string inputs for the per-tier price fields, seeded from whatever the
 * row already has. Shared by the package and add-on editors so both stay in
 * step with the tier list above.
 */
export function seedSizePriceInputs(raw: unknown): Record<VehicleSizeId, string> {
  const seed = Object.fromEntries(SIZE_ORDER.map((id) => [id, ''])) as Record<VehicleSizeId, string>;
  for (const sp of parseSizePrices(raw)) seed[sp.size] = (sp.price_cents / 100).toFixed(2);
  return seed;
}

/** Turn those inputs back into storable rows, dropping blank and invalid tiers. */
export function sizePriceRowsFromInputs(inputs: Record<VehicleSizeId, string>): SizePrice[] {
  return VEHICLE_SIZES
    .map((s) => ({ size: s.id, price_cents: Math.round(parseFloat(inputs[s.id]) * 100) }))
    .filter((r) => Number.isFinite(r.price_cents) && r.price_cents > 0);
}
