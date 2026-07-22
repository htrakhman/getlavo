// Canonical vehicle size tiers used for size-based service pricing. Detailers
// price the same package differently by vehicle size, so a package can carry an
// optional price per tier (service_packages.size_prices) on top of its base
// price. Labels mirror the language detailers already use on their menus.

export type VehicleSizeId = 'sedan' | 'suv' | 'xl';

export const VEHICLE_SIZES: { id: VehicleSizeId; label: string; short: string }[] = [
  { id: 'sedan', label: 'Sedan / Coupe', short: 'Sedan' },
  { id: 'suv', label: 'SUV / Small Pickup', short: 'SUV' },
  { id: 'xl', label: '3-Row / Minivan / Large Pickup', short: '3-Row' },
];

export type SizePrice = { size: VehicleSizeId; price_cents: number };

const SIZE_ORDER = VEHICLE_SIZES.map((s) => s.id);

/**
 * Normalize the raw `size_prices` jsonb into a clean, tier-ordered list.
 * Tolerates nulls, unknown sizes, and non-numeric prices so a malformed row
 * can never crash a render.
 */
export function parseSizePrices(raw: unknown): SizePrice[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (r): r is SizePrice =>
        !!r &&
        typeof r === 'object' &&
        SIZE_ORDER.includes((r as any).size) &&
        Number.isFinite((r as any).price_cents) &&
        (r as any).price_cents > 0,
    )
    .map((r) => ({ size: r.size, price_cents: Math.round(r.price_cents) }))
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
