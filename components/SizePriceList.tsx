import { parseSizePrices, sizeLabel } from '@/lib/vehicle-sizes';
import { VehicleTypeIcon } from './VehicleTypeIcon';

/**
 * The per-vehicle-type price breakdown under a package or add-on. One
 * component for every surface that advertises the menu — the operator's own
 * editor, the public operator and building pages, the plan pickers, and the
 * booking form — so a tier can never show up styled one way here and another
 * way there.
 *
 * Renders nothing when the row has no tier pricing, which is what lets callers
 * drop it in unconditionally.
 */
export function SizePriceList({
  raw,
  decimals = 0,
  className = 'text-xs text-ink-400',
  format,
  priceStyle,
}: {
  raw: unknown;
  /** Add-ons quote cents (49.00); packages are whole dollars (350). */
  decimals?: 0 | 2;
  className?: string;
  /** Override the default formatting — the building page has its own. */
  format?: (cents: number) => string;
  /** Building pages tint prices with the building's accent colour. */
  priceStyle?: React.CSSProperties;
}) {
  const tiers = parseSizePrices(raw);
  if (tiers.length === 0) return null;

  const show = format ?? ((cents: number) => `$${(cents / 100).toFixed(decimals)}`);

  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 ${className}`}>
      {tiers.map((t) => (
        <span key={t.size} className="inline-flex items-center gap-1.5">
          <VehicleTypeIcon type={t.size} className="h-4 w-9 shrink-0 opacity-70" />
          <span>{sizeLabel(t.size)}</span>
          <span className="text-gleam" style={priceStyle}>{show(t.price_cents)}</span>
        </span>
      ))}
    </div>
  );
}
