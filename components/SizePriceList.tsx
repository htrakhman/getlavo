import { VEHICLE_SIZES, parseSizePrices } from '@/lib/vehicle-sizes';
import { VehicleTypeIcon } from './VehicleTypeIcon';

/**
 * The per-vehicle-type price breakdown under a package or add-on. One
 * component for every surface that advertises the menu — the operator's own
 * editor, the public operator and building pages, the plan pickers, and the
 * booking form — so a tier can never show up styled one way here and another
 * way there.
 *
 * One tier per line: icon, vehicle type and price all sit on the same row, and
 * the price is pinned to the right so the three prices read as a column. The
 * tiers used to flow inline and wrap, which put the longest label ("3-Row SUV /
 * Pickup / Minivan") on two lines with its price floating beside the break.
 *
 * A row with no price shows an em dash — the tier exists, the price doesn't
 * yet. Whether an entirely unpriced package draws those three blanks at all is
 * up to the caller (see `placeholders`).
 */
export function SizePriceList({
  raw,
  decimals = 0,
  className = 'text-xs text-ink-400',
  format,
  priceStyle,
  placeholders = false,
}: {
  raw: unknown;
  /** Add-ons quote cents (49.00); packages are whole dollars (350). */
  decimals?: 0 | 2;
  className?: string;
  /** Override the default formatting — the building page has its own. */
  format?: (cents: number) => string;
  /** Building pages tint prices with the building's accent colour. */
  priceStyle?: React.CSSProperties;
  /**
   * Draw the three tiers even when the operator has priced none of them.
   *
   * Off by default, because on a resident-facing menu three em dashes are three
   * lines that quote nothing — and when an operator has typed their tier prices
   * into the description instead, the blanks sit directly under those numbers
   * and read as a contradiction.
   *
   * On for the surfaces where the blank is the point: the operator's own
   * editors, where it's the prompt to fill the tiers in, and the building
   * marketplace, where a manager comparing operators should see who prices by
   * vehicle type and who hasn't. A partly priced package always draws all three
   * tiers regardless — a gap between two priced tiers is information.
   */
  placeholders?: boolean;
}) {
  const priced = new Map(parseSizePrices(raw).map((t) => [t.size, t.price_cents]));
  if (priced.size === 0 && !placeholders) return null;
  const show = format ?? ((cents: number) => `$${(cents / 100).toFixed(decimals)}`);

  return (
    <dl className={`space-y-1 ${className}`}>
      {VEHICLE_SIZES.map((s) => {
        const cents = priced.get(s.id);
        return (
          <div key={s.id} className="flex items-center gap-2">
            <VehicleTypeIcon type={s.id} className="h-4 w-9 shrink-0 opacity-70" />
            {/* Truncated rather than wrapped: the price has to stay on the
                label's line, and the icon already says which vehicle it is. */}
            <dt className="min-w-0 flex-1 truncate" title={s.label}>
              {s.label}
            </dt>
            {cents == null ? (
              <dd className="shrink-0 text-ink-500" title="No price set for this vehicle type yet">
                —
              </dd>
            ) : (
              <dd className="shrink-0 text-gleam" style={priceStyle}>
                {show(cents)}
              </dd>
            )}
          </div>
        );
      })}
    </dl>
  );
}
