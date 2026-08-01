'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

const dollars = (cents: number | null | undefined) =>
  typeof cents === 'number' && cents > 0 ? (cents / 100).toFixed(2) : '';

/**
 * The operator's regular wash — the one price residents see as "Standard wash"
 * when they book without picking a package.
 *
 * This lived only in the agreement builder for a while, and before that it was
 * derived from the cheapest active service package. Deriving it was the bug: a
 * $1.00 test package made the standard wash $1.00 on the resident booking form.
 * The rate an operator charges for their regular wash is something they state,
 * so they state it here — and here is the only place the number comes from
 * (see lib/wash-pricing.ts).
 */
export function StandardWashEditor({ op }: { op: any }) {
  const router = useRouter();
  const [base, setBase] = useState(dollars(op.base_price_cents));
  const [openSlot, setOpenSlot] = useState(dollars(op.open_slot_price_cents));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const baseCents = Math.round((parseFloat(base) || 0) * 100);
  const openSlotCents = Math.round((parseFloat(openSlot) || 0) * 100);

  async function save() {
    if (baseCents <= 0) {
      setErr('Enter what a wash on a building wash day costs.');
      return;
    }
    setBusy(true);
    setErr(null);
    const sb = supabaseBrowser();
    const { error } = await sb
      .from('operators')
      .update({
        base_price_cents: baseCents,
        // Optional: an operator who doesn't price on-demand visits separately
        // charges their wash-day rate either way.
        open_slot_price_cents: openSlotCents > 0 ? openSlotCents : null,
      })
      .eq('id', op.id);
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  return (
    <div className="card p-6">
      <div className="mb-4">
        <h3 className="font-display text-xl">Standard wash</h3>
        <p className="mt-0.5 text-xs text-ink-500">
          Your regular wash — what residents book when they don't pick a package. Buildings you've
          already signed keep the rate on their{' '}
          <Link href="/operator/contracts" className="text-gleam hover:underline">agreement</Link>.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Building wash day (USD)</label>
          <input
            className="field"
            type="number"
            step="0.01"
            min="1"
            placeholder="e.g. 45"
            value={base}
            onChange={(e) => setBase(e.target.value)}
          />
          <p className="mt-1 text-xs text-ink-500">Your rate on the day you're already at the building.</p>
        </div>
        <div>
          <label className="label">On-demand (USD, optional)</label>
          <input
            className="field"
            type="number"
            step="0.01"
            min="1"
            placeholder="e.g. 60"
            value={openSlot}
            onChange={(e) => setOpenSlot(e.target.value)}
          />
          <p className="mt-1 text-xs text-ink-500">A trip on any other date. Leave blank to charge the same.</p>
        </div>
      </div>

      <p className="mt-4 text-xs text-ink-500">
        This is not a package price. Your detailing packages live below and never change what the
        standard wash costs.
      </p>

      {err && <div className="mt-3 text-sm text-red-400">{err}</div>}

      <div className="mt-5">
        <button onClick={save} disabled={busy} className="btn-primary text-sm">
          {busy ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}
