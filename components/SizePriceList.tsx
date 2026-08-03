import { Fragment } from 'react';
import { VEHICLE_SIZES, parseSizePrices } from '@/lib/vehicle-sizes';
import { typedTierPrices } from '@/lib/package-description';
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
 * The three rows are one grid rather than three independent flex rows, so the
 * icon, label and price columns are measured together — every price in a list
 * starts at the same x, not just at the same right edge.
 *
 * A tier with no `size_prices` entry falls back to whatever the operator typed
 * into the description ("| Pricing: Sedan/Coupe $70 • …"), which for the many
 * operators who never filled in the tier fields is the only place those numbers
 * exist. Printing them here rather than as a separate block below is the whole
 * point of the row: a package priced in prose ends up looking like a package
 * priced properly, instead of three em dashes contradicting a footnote.
 *
 * A tier with neither shows an em dash — the tier exists, the price doesn't
 * yet. Whether a package with no price anywhere draws those three blanks at all
 * is up to the caller (see `placeholders`).
 *
 * A row that is genuinely one price for every vehicle collapses to a single
 * line carrying all three icons (see `flatCents`), rather than three rows
 * repeating the same number.
 */
export function SizePriceList({
  raw,
  description,
  decimals = 0,
  className = 'text-xs text-ink-400',
  format,
  priceStyle,
  placeholders = false,
  flatCents,
}: {
  raw: unknown;
  /**
   * The item's description, read only for a typed-out "Pricing: …" tail to fall
   * back on. Pass it wherever one exists; add-ons and bare rows can omit it.
   */
  description?: string | null;
  /** Add-ons quote cents (49.00); packages are whole dollars (350). */
  decimals?: 0 | 2;
  className?: string;
  /** Override the default formatting — the building page has its own. */
  format?: (cents: number) => string;
  /** Building pages tint prices with the building's accent colour. */
  priceStyle?: React.CSSProperties;
  /**
   * Draw the three tiers even when the item has no price on any of them —
   * neither a saved tier nor one typed into the description.
   *
   * Off by default: on a resident-facing menu those are three lines that quote
   * nothing, and a package with no vehicle pricing at all is better read as a
   * flat-priced package than as one whose prices are missing.
   *
   * On for the surfaces where the blank is the point: the operator's own
   * editors, where it's the prompt to fill the tiers in, and the building
   * marketplace, where a manager comparing operators should see who prices by
   * vehicle type and who hasn't. A package priced on even one tier always draws
   * all three regardless — a gap between two priced tiers is information.
   */
  placeholders?: boolean;
  /**
   * The row's single price, for a row that has no per-vehicle pricing at all.
   *
   * This is what add-ons need and packages don't. An add-on carries no
   * description, so unlike a package there's no typed-out "Pricing: …" tail to
   * fall back on — an add-on the operator never tiered had nothing to draw and
   * rendered as a bare "+$10.00" next to packages showing all three vehicle
   * rows. But it isn't unpriced: a flat add-on costs that same $10 whatever is
   * parked there, which is a real answer to "what does this cost for my car"
   * and belongs on the menu in the same language as everything else.
   *
   * Answered on one line with all three icons rather than three lines quoting
   * the same number: the icons carry "any vehicle" on their own, and an
   * operator with twenty add-ons would otherwise turn the booking form into a
   * page of repeats.
   */
  flatCents?: number | null;
}) {
  const priced = new Map(parseSizePrices(raw).map((t) => [t.size, t.price_cents]));
  const typed = typedTierPrices(description);
  const untiered = priced.size === 0 && Object.keys(typed).length === 0;
  const flat = untiered && Number.isFinite(flatCents) && (flatCents as number) > 0 ? (flatCents as number) : null;
  if (untiered && flat == null && !placeholders) return null;
  const show = format ?? ((cents: number) => `$${(cents / 100).toFixed(decimals)}`);

  if (flat != null) {
    return (
      <dl className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 ${className}`}>
        <span className="flex items-center gap-0.5">
          {VEHICLE_SIZES.map((s) => (
            <VehicleTypeIcon key={s.id} type={s.id} className="h-4 w-7 opacity-70" />
          ))}
        </span>
        <dt className="truncate" title={VEHICLE_SIZES.map((s) => s.label).join(' · ')}>
          Any vehicle type
        </dt>
        <dd className="justify-self-end text-gleam" style={priceStyle}>
          {show(flat)}
        </dd>
      </dl>
    );
  }

  return (
    <dl className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 ${className}`}>
      {VEHICLE_SIZES.map((s) => {
        const cents = priced.get(s.id);
        const fromText = cents == null ? typed[s.id] : undefined;
        return (
          <Fragment key={s.id}>
            <VehicleTypeIcon type={s.id} className="h-4 w-9 opacity-70" />
            {/* Truncated rather than wrapped: the price has to stay on the
                label's line, and the icon already says which vehicle it is. */}
            <dt className="truncate" title={s.label}>
              {s.label}
            </dt>
            {cents != null ? (
              <dd className="justify-self-end text-gleam" style={priceStyle}>
                {show(cents)}
              </dd>
            ) : fromText ? (
              <dd
                className="justify-self-end text-gleam"
                style={priceStyle}
                title="Priced in this package's description"
              >
                {fromText}
              </dd>
            ) : (
              <dd className="justify-self-end text-ink-500" title="No price set for this vehicle type yet">
                —
              </dd>
            )}
          </Fragment>
        );
      })}
    </dl>
  );
}
