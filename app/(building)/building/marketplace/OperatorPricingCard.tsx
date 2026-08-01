'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { money } from '@/lib/format';
import { SizePriceList } from '@/components/SizePriceList';
import { menuSummary, rangeLabel, type OperatorPricing, type PricedItem } from '@/lib/operator-pricing';

type Props = {
  operatorId: string;
  name: string;
  description: string | null;
  ratingAvg: number | null;
  ratingCount: number | null;
  serviceRadiusMiles: number | null;
  insured: boolean;
  requestable: boolean;
  setupChip: string | null;
  pendingNote: string | null;
  pricing: OperatorPricing;
};

function PriceLine({ item }: { item: PricedItem }) {
  return (
    <li className="py-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-ink-200">{item.label}</span>
        <span className="shrink-0 font-display text-gleam">
          {item.sizePrices.length > 0 ? 'from ' : ''}
          {money(item.fromCents)}
        </span>
      </div>
      {/* Drawn whether or not the tiers are priced — a manager comparing
          operators should see who prices by vehicle type and who hasn't. */}
      <SizePriceList
        raw={item.sizePrices}
        description={item.description}
        placeholders
        className="mt-1.5 text-[11px] text-ink-400"
      />
    </li>
  );
}

/**
 * A marketplace card whose price block opens the operator's entire menu.
 *
 * The card used to headline `base_price_cents` alone, which told a manager what
 * the building pays and nothing about what their residents would be quoted. The
 * headline is now the resident-facing range; hovering (or tapping, or tabbing
 * to) the block reveals every package, vehicle tier and add-on consolidated in
 * one panel, with the building-day and on-demand rates alongside them.
 */
export function OperatorPricingCard({
  operatorId,
  name,
  description,
  ratingAvg,
  ratingCount,
  serviceRadiusMiles,
  insured,
  requestable,
  setupChip,
  pendingNote,
  pricing,
}: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const hasMenu = pricing.packages.length > 0 || pricing.addons.length > 0;

  // Touch and click-away: hover alone strands the panel open on a phone, where
  // the first tap fires mouseenter and never a mouseleave.
  useEffect(() => {
    if (!open) return;
    const onDocDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDocDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDocDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div
      className={`card relative p-5 transition-colors hover:border-gleam/40 ${
        requestable ? '' : 'border-amber-500/30'
      }`}
    >
      {/* Stretched link: the whole card stays clickable without nesting the
          pricing trigger inside an anchor, which is invalid and swallows taps. */}
      <Link
        href={`/building/marketplace/${operatorId}`}
        aria-label={`View ${name}`}
        className="absolute inset-0 z-10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gleam/40"
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-display text-lg truncate">{name}</div>
          {(ratingCount ?? 0) > 0 && (
            <div className="mt-0.5 text-xs text-ink-400">
              ★ {Number(ratingAvg).toFixed(1)} · {ratingCount} reviews
            </div>
          )}
          {description && <p className="mt-2 text-sm text-ink-300 line-clamp-2">{description}</p>}
        </div>

        <div
          ref={wrapRef}
          className="relative z-20 shrink-0 text-right"
          onMouseEnter={() => hasMenu && setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          <button
            type="button"
            aria-expanded={hasMenu ? open : undefined}
            aria-controls={hasMenu ? panelId : undefined}
            disabled={!hasMenu}
            onClick={() => setOpen((v) => !v)}
            onFocus={() => hasMenu && setOpen(true)}
            onBlur={(e) => {
              if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node)) setOpen(false);
            }}
            className="block rounded-lg px-1 text-right focus:outline-none focus:ring-2 focus:ring-gleam/40 disabled:cursor-default"
          >
            <span className="block font-display text-xl text-gleam">{rangeLabel(pricing)}</span>
            <span className="mt-0.5 block text-xs text-ink-400">
              {hasMenu ? menuSummary(pricing) : 'per building day'}
            </span>
            {hasMenu && (
              <span className="mt-0.5 block text-[11px] text-gleam/70">All pricing ▾</span>
            )}
          </button>

          {hasMenu && open && (
            <div
              id={panelId}
              role="dialog"
              aria-label={`${name} full pricing`}
              className="absolute right-0 top-full z-30 mt-2 w-[min(20rem,calc(100vw-3rem))] animate-fade-up rounded-2xl border border-white/10 bg-ink-950 p-4 text-left shadow-card"
            >
              <div className="text-xs uppercase tracking-widest text-ink-400">Full pricing</div>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                {pricing.basePriceCents != null && (
                  <span className="text-ink-400">
                    Building day <span className="text-ink-100">{money(pricing.basePriceCents)}</span>
                  </span>
                )}
                {pricing.openSlotPriceCents != null && (
                  <span className="text-ink-400">
                    On-demand <span className="text-ink-100">{money(pricing.openSlotPriceCents)}</span>
                  </span>
                )}
              </div>

              {pricing.packages.length > 0 && (
                <div className="mt-3 border-t border-white/5 pt-2">
                  <div className="text-[11px] uppercase tracking-widest text-ink-400">Packages</div>
                  <ul className="mt-1 divide-y divide-white/5 text-sm">
                    {pricing.packages.map((p) => (
                      <PriceLine key={p.id} item={p} />
                    ))}
                  </ul>
                </div>
              )}

              {pricing.addons.length > 0 && (
                <div className="mt-3 border-t border-white/5 pt-2">
                  <div className="text-[11px] uppercase tracking-widest text-ink-400">Add-ons</div>
                  <ul className="mt-1 divide-y divide-white/5 text-sm">
                    {pricing.addons.map((a) => (
                      <PriceLine key={a.id} item={a} />
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-ink-400">
        {pricing.basePriceCents != null && (
          <span className="chip">{money(pricing.basePriceCents)} / building day</span>
        )}
        {serviceRadiusMiles != null && <span className="chip">{serviceRadiusMiles} mi radius</span>}
        {pricing.openSlotPriceCents != null && (
          <span className="chip">On-demand {money(pricing.openSlotPriceCents)}</span>
        )}
        {insured && <span className="chip text-gleam/80">✓ Insured</span>}
        {setupChip && <span className="chip text-amber-600">{setupChip}</span>}
      </div>

      {requestable ? (
        <div className="mt-4 text-xs text-gleam">View &amp; request →</div>
      ) : (
        <div className="mt-4 text-xs text-amber-600">
          Still finishing setup — waiting on {pendingNote}. You can view their profile, but
          can&rsquo;t request them yet.
        </div>
      )}
    </div>
  );
}
