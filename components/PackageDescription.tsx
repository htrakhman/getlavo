import { parsePackageDescription, splitTierPricing } from '@/lib/package-description';

/**
 * A package's description, laid out instead of dumped.
 *
 * Every surface that advertises the menu — the booking form, the plan pickers,
 * the public operator and building pages, the operator's own editor — used to
 * print `description` raw, which turned an operator's "sentence • step • step •
 * … | Pricing: …" into an unreadable paragraph. One component so the same text
 * reads the same way everywhere: opening line, what's included as a list, and
 * whatever's left of the typed-out prices last — the per-vehicle brackets are
 * lifted onto the tier row (see SizePriceList), so what lands here is only the
 * money that names no vehicle.
 *
 * Renders nothing for an empty description, so callers can drop it in
 * unconditionally.
 */
export function PackageDescription({
  text,
  className = 'text-sm text-ink-300',
}: {
  text: string | null | undefined;
  className?: string;
}) {
  const { lead, points, pricing } = parsePackageDescription(text);
  // Any line of the typed "Pricing: …" tail that names a vehicle tier is drawn
  // by SizePriceList, on the row with the icons, whether or not the operator
  // also filled in size_prices — so it must not be printed a second time here.
  // What's left is a price that isn't a bracket ("Add ceramic $30"); it has
  // nowhere else to go and stays.
  const prices = splitTierPricing(pricing).rest;
  if (!lead && points.length === 0 && prices.length === 0) return null;

  return (
    <div className={className}>
      {lead && <p className="leading-relaxed">{lead}</p>}

      {points.length > 0 && (
        <ul className={`${lead ? 'mt-1.5' : ''} space-y-1`}>
          {points.map((point, i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden className="select-none text-gleam/60">•</span>
              <span className="min-w-0">{point}</span>
            </li>
          ))}
        </ul>
      )}

      {prices.length > 0 && (
        <div className={`${lead || points.length ? 'mt-2 border-t border-white/10 pt-2' : ''}`}>
          <div className="text-[11px] uppercase tracking-widest text-ink-500">Pricing</div>
          <dl className="mt-1 space-y-0.5">
            {prices.map((line, i) => (
              <div key={i} className="flex items-baseline justify-between gap-3">
                <dt className="min-w-0">{line.label}</dt>
                {line.price && <dd className="shrink-0 text-gleam">{line.price}</dd>}
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
