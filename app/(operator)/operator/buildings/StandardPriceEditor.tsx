'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { money } from '@/lib/format';

/**
 * The standard wash rate for one building. Without it the resident-facing
 * price falls back to the operator's global rate, which is derived from the
 * cheapest package rather than chosen — so this is the only place the "standard
 * wash" price a resident sees is actually set.
 */
export function StandardPriceEditor({
  partnershipId,
  priceCents,
  fallbackCents,
}: {
  partnershipId: string;
  priceCents: number | null;
  fallbackCents: number | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(priceCents != null ? (priceCents / 100).toFixed(2) : '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save(next: number | null) {
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/partnerships/${partnershipId}/price`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceCents: next }),
    });
    setBusy(false);
    if (!res.ok) {
      let detail = '';
      try { detail = (await res.json()).error ?? ''; } catch {}
      setErr(detail || 'Could not save the price.');
      return;
    }
    setEditing(false);
    router.refresh();
  }

  function submit() {
    const dollars = parseFloat(value);
    if (!Number.isFinite(dollars) || dollars <= 0) {
      setErr('Enter a price like 45.00');
      return;
    }
    save(Math.round(dollars * 100));
  }

  if (!editing) {
    return (
      <div className="mt-3 text-xs">
        <span className="text-ink-400">Standard wash: </span>
        {priceCents != null ? (
          <span className="font-display text-gleam">{money(priceCents)}</span>
        ) : (
          <span className="text-amber-600">
            not set{fallbackCents != null ? ` — residents are quoted ${money(fallbackCents)}` : ''}
          </span>
        )}
        <button type="button" onClick={() => setEditing(true)} className="ml-2 text-gleam underline underline-offset-2">
          {priceCents != null ? 'Change' : 'Set price'}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-ink-400">$</span>
        <input
          className="field w-24 py-1 text-sm"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="45.00"
          inputMode="decimal"
          autoFocus
        />
        <button type="button" onClick={submit} disabled={busy} className="btn-primary px-3 py-1 text-xs">
          {busy ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={() => { setEditing(false); setErr(null); }}
          className="text-xs text-ink-400 underline underline-offset-2"
        >
          Cancel
        </button>
        {priceCents != null && (
          <button
            type="button"
            onClick={() => save(null)}
            disabled={busy}
            className="text-xs text-ink-500 underline underline-offset-2"
          >
            Clear
          </button>
        )}
      </div>
      {err && <p className="mt-1 text-xs text-red-400">{err}</p>}
      <p className="mt-1 text-[11px] text-ink-500">What a resident here pays for a standard wash.</p>
    </div>
  );
}
