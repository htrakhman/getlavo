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
 * All three tiers are always drawn, priced or not. Hiding the row for a package
 * with no tier prices made "this operator hasn't set vehicle pricing" look
 * identical to "this package has no vehicle pricing to set", and the difference
 * matters to both sides: the operator needs to see the blank to know it's
 * theirs to fill in (several have typed tier prices into the description
 * instead, where nothing can charge against them), and the resident gets the
 * same three-line shape on every package rather than a menu where some items
 * mention vehicle size and others don't.
 *
 * A tier with no `size_prices` entry falls back to whatever the operator typed
 * into the description ("| Pricing: Sedan/Coupe $70 • …"), which for the many
 * operators who never filled in the tier fields is the only place those numbers
 * exist. Printing them here rather than as a separate block below is the whole
 * point of the row: a package priced in prose ends up looking like a package
 * priced properly, instead of three em dashes contradicting a footnote.
 *
 * A tier with neither shows an em dash — the tier exists, the price doesn't yet.
 */
export function SizePriceList({
  raw,
  description,
  decimals = 0,
  className = 'text-xs text-ink-400',
  format,
  priceStyle,
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
}) {
  const priced = new Map(parseSizePrices(raw).map((t) => [t.size, t.price_cents]));
  const typed = typedTierPrices(description);
  const show = format ?? ((cents: number) => `$${(cents / 100).toFixed(decimals)}`);

  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 ${className}`}>
      {VEHICLE_SIZES.map((s) => {
        const cents = priced.get(s.id);
        const fromText = cents == null ? typed[s.id] : undefined;
        return (
          <span key={s.id} className="inline-flex items-center gap-1.5">
            <VehicleTypeIcon type={s.id} className="h-4 w-9 shrink-0 opacity-70" />
            <span>{s.label}</span>
            {cents != null ? (
              <span className="text-gleam" style={priceStyle}>
                {show(cents)}
              </span>
            ) : fromText ? (
              <span className="text-gleam" style={priceStyle} title="Priced in this package's description">
                {fromText}
              </span>
            ) : (
              <span className="text-ink-500" title="No price set for this vehicle type yet">
                —
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}
