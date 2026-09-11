'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PaymentMethodCapture } from '@/components/stripe/PaymentMethodCapture';
import {
  describeBillingArrangement,
  type BillingMode,
} from '@/lib/billing-arrangement';

/**
 * Who pays for a wash at this property.
 *
 * Lavo was built around the occupant paying, which is right for an apartment
 * building and wrong for a commercial one — in an office park the buying
 * relationship is with the property and the wash is an amenity it funds. This
 * is where a manager says which it is.
 */
const OPTIONS: { mode: BillingMode; title: string }[] = [
  { mode: 'occupant_pays', title: 'Each occupant pays for their own wash' },
  { mode: 'property_pays', title: 'The property pays for every wash' },
  { mode: 'property_subsidized', title: 'The property covers part of each wash' },
];

export function BillingArrangementPanel({
  initialMode,
  initialSubsidyCents,
  hasCardOnFile,
  cardLabel,
  hasExecutedAgreement,
}: {
  initialMode: BillingMode;
  initialSubsidyCents: number;
  hasCardOnFile: boolean;
  cardLabel: string | null;
  hasExecutedAgreement: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<BillingMode>(initialMode);
  const [subsidy, setSubsidy] = useState(
    initialSubsidyCents > 0 ? (initialSubsidyCents / 100).toFixed(2) : '',
  );
  const [cardSaved, setCardSaved] = useState(hasCardOnFile);
  const [showCard, setShowCard] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const needsCard = mode !== 'occupant_pays';
  const subsidyCents = Math.round((parseFloat(subsidy) || 0) * 100);

  async function post(body: Record<string, unknown>) {
    const res = await fetch('/api/building/billing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(d.error || 'Could not save. Please try again.');
  }

  async function onCardSaved(paymentMethodId: string) {
    setErr(null);
    try {
      await post({ paymentMethodId });
      setCardSaved(true);
      setShowCard(false);
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      await post({ billingMode: mode, subsidyCents: mode === 'property_subsidized' ? subsidyCents : 0 });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-6">
      <div className="mb-4">
        <h3 className="font-display text-xl">Who pays for washes</h3>
        <p className="mt-0.5 text-xs text-ink-500">
          This is a term of your service agreement, so changing it changes the agreement.
        </p>
      </div>

      {!hasExecutedAgreement && (
        <div className="mb-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-xs text-amber-600">
          This building has no fully signed agreement yet. Once both sides have signed, you can set
          who pays here.
        </div>
      )}

      <div className="space-y-2">
        {OPTIONS.map((o) => (
          <label
            key={o.mode}
            className={`flex cursor-pointer gap-3 rounded-lg border px-4 py-3 ${
              mode === o.mode ? 'border-gleam/40 bg-gleam/5' : 'border-white/10 bg-white/5 hover:border-white/20'
            }`}
          >
            <input
              type="radio"
              name="billing-mode"
              className="mt-1"
              checked={mode === o.mode}
              onChange={() => setMode(o.mode)}
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-ink-100">{o.title}</span>
              <span className="mt-0.5 block text-xs text-ink-400">
                {describeBillingArrangement(o.mode, o.mode === 'property_subsidized' ? subsidyCents : 0)}
              </span>
            </span>
          </label>
        ))}
      </div>

      {mode === 'property_subsidized' && (
        <div className="mt-4 max-w-[220px]">
          <label className="label" htmlFor="subsidy">The property covers (USD per wash)</label>
          <input
            id="subsidy"
            className="field"
            type="number"
            step="0.01"
            min="0"
            placeholder="e.g. 30"
            value={subsidy}
            onChange={(e) => setSubsidy(e.target.value)}
          />
        </div>
      )}

      {needsCard && (
        <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-medium text-ink-100">Property card on file</div>
              <div className="mt-0.5 text-xs text-ink-400">
                {cardSaved
                  ? cardLabel ?? 'A card is saved for this property.'
                  : 'Required before the property can pay for washes.'}
              </div>
            </div>
            <button onClick={() => setShowCard((v) => !v)} className="btn-quiet text-xs">
              {showCard ? 'Cancel' : cardSaved ? 'Replace card' : 'Add card'}
            </button>
          </div>
          {showCard && (
            <div className="mt-4">
              <PaymentMethodCapture
                setupIntentEndpoint="/api/building/setup-intent"
                onSaved={onCardSaved}
                buttonLabel="Save property card"
              />
            </div>
          )}
        </div>
      )}

      <p className="mt-4 text-xs text-ink-500">
        Add-ons an occupant chooses at checkout are always paid by that occupant, whichever option
        is selected.
      </p>

      {err && <div className="mt-3 text-sm text-red-400">{err}</div>}

      <div className="mt-5">
        <button
          onClick={save}
          disabled={busy || !hasExecutedAgreement || (needsCard && !cardSaved)}
          className="btn-primary text-sm"
        >
          {busy ? 'Saving…' : saved ? '✓ Saved' : 'Save arrangement'}
        </button>
      </div>
    </div>
  );
}
