// Canonical vehicle size tiers used for size-based pricing. Detailers price the
// same work differently by vehicle type, so a service package
// (service_packages.size_prices) and an add-on (operator_addons.size_prices)
// each carry an optional price per tier on top of their base price. Labels
// mirror the language detailers already use on their menus.

export type VehicleSizeId = 'sedan' | 'suv' | 'three_row' | 'truck';

export const VEHICLE_SIZES: { id: VehicleSizeId; label: string; short: string }[] = [
  { id: 'sedan', label: 'Sedan / Coupe', short: 'Sedan' },
  { id: 'suv', label: 'SUV / Small SUV', short: 'SUV' },
  { id: 'three_row', label: '3-Row SUV', short: '3-Row' },
  { id: 'truck', label: 'Pickup Truck / Minivan', short: 'Truck' },
];

export type SizePrice = { size: VehicleSizeId; price_cents: number };

const SIZE_ORDER = VEHICLE_SIZES.map((s) => s.id);

// The original three-tier menu lumped 3-row SUVs, minivans and large pickups
// into one `xl` tier. Rows written before the split still carry it, so read it
// as the 3-row tier rather than dropping the operator's top price on the floor.
// Migration 0049 rewrites stored rows; this keeps any straggler readable.
const LEGACY_SIZES: Record<string, VehicleSizeId> = { xl: 'three_row' };

function normalizeSize(raw: unknown): VehicleSizeId | null {
  if (typeof raw !== 'string') return null;
  if ((SIZE_ORDER as string[]).includes(raw)) return raw as VehicleSizeId;
  return LEGACY_SIZES[raw] ?? null;
}

/**
 * Normalize the raw `size_prices` jsonb into a clean, tier-ordered list.
 * Tolerates nulls, unknown sizes, duplicates and non-numeric prices so a
 * malformed row can never crash a render.
 */
export function parseSizePrices(raw: unknown): SizePrice[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<VehicleSizeId>();
  const out: SizePrice[] = [];
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue;
    const size = normalizeSize((r as any).size);
    const cents = (r as any).price_cents;
    if (!size || seen.has(size)) continue;
    if (!Number.isFinite(cents) || cents <= 0) continue;
    seen.add(size);
    out.push({ size, price_cents: Math.round(cents) });
  }
  return out.sort((a, b) => SIZE_ORDER.indexOf(a.size) - SIZE_ORDER.indexOf(b.size));
}

export function sizeLabel(id: VehicleSizeId): string {
  return VEHICLE_SIZES.find((s) => s.id === id)?.label ?? id;
}

/** Lowest tier price, used as the "from" price when size pricing is set. */
export function fromPriceCents(sizePrices: SizePrice[], fallback: number): number {
  if (!sizePrices.length) return fallback;
  return Math.min(...sizePrices.map((s) => s.price_cents));
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
