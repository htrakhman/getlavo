'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { parseSizePrices } from '@/lib/vehicle-sizes';
import { SizePriceList } from '@/components/SizePriceList';
import { PackageDescription } from '@/components/PackageDescription';

type Pkg = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  est_minutes: number | null;
  size_prices: { size: string; price_cents: number }[];
};

export function PlanPicker({
  packages,
  currentPackageId,
  operatorName,
}: {
  packages: Pkg[];
  currentPackageId: string | null;
  operatorName: string | null;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(currentPackageId ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save() {
    if (!selected) return;
    setBusy(true);
    setErr(null);
    setSaved(false);
    const res = await fetch('/api/residents/package', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packageId: selected }),
    });
    if (!res.ok) {
      let detail = '';
      try { detail = (await res.json()).error ?? ''; } catch {}
      setErr(detail || 'Could not save your plan — please try again.');
      setBusy(false);
      return;
    }
    setBusy(false);
    setSaved(true);
    router.refresh();
  }

  const operatorLine = (
    <div className="text-xs uppercase tracking-widest text-ink-400">
      Operator:{' '}
      <span className={operatorName ? 'text-gleam' : 'text-amber-600'}>
        {operatorName ?? 'Not assigned yet'}
      </span>
    </div>
  );

  if (!packages.length) {
    return (
      <div className="card mt-6 p-6">
        <h3 className="font-display text-lg">Wash plan</h3>
        <div className="mt-2">{operatorLine}</div>
        <p className="mt-2 text-sm text-ink-400">
          {operatorName
            ? 'This operator hasn’t published any plans yet — check back soon.'
            : 'Plans appear here once an operator is assigned to your building.'}
        </p>
      </div>
    );
  }

  return (
    <div className="card mt-6 p-6">
      <h3 className="font-display text-lg">Wash plan</h3>
      <div className="mt-2">{operatorLine}</div>
      <p className="mt-1 text-xs text-ink-400">
        {currentPackageId
          ? 'Your current plan. You’re charged per completed wash.'
          : `Choose a plan from ${operatorName ?? 'your building’s operator'} to get on the wash-day schedule. Without a plan the crew won’t service your car.`}
      </p>

      {err && <div className="mt-3 text-sm text-red-400">{err}</div>}
      {saved && <div className="mt-3 text-sm text-gleam">Plan saved — you’re on the schedule.</div>}

      <div className="mt-4 space-y-3">
        {packages.map((p) => (
          <button
            type="button"
            key={p.id}
            onClick={() => setSelected(p.id)}
            className={`card block w-full p-4 text-left transition-colors ${selected === p.id ? 'border-gleam' : 'hover:border-gleam/40'}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-display text-base">
                  {p.name}
                  {currentPackageId === p.id && <span className="chip ml-2 text-gleam">current</span>}
                </div>
                <PackageDescription
                  text={p.description}
                  showPricing={parseSizePrices(p.size_prices).length === 0}
                  className="mt-1.5 text-sm text-ink-300"
                />
                <SizePriceList raw={p.size_prices} className="mt-2 text-xs text-ink-400" />
              </div>
              <div className="shrink-0 text-right">
                <div className="font-display text-lg text-gleam">
                  {(parseSizePrices(p.size_prices).length ? 'from ' : '') + `$${(p.price_cents / 100).toFixed(0)}`}
                </div>
                <div className="text-xs text-ink-400">per wash</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={save}
        disabled={!selected || selected === currentPackageId || busy}
        className="btn-primary mt-4"
      >
        {busy ? 'Saving…' : currentPackageId ? 'Change plan' : 'Choose plan'}
      </button>
    </div>
  );
}
