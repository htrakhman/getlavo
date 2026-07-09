'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  contractId: string;
  operatorName: string;
  alreadySigned?: boolean;
}

export function OperatorContractSigner({ contractId, operatorName, alreadySigned }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (alreadySigned) {
    return (
      <div className="mt-2 inline-flex items-center gap-2 text-gleam text-sm">
        <span>✓</span> You've signed this agreement — awaiting building manager's signature
      </div>
    );
  }

  async function sign() {
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/contracts/${contractId}/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signedName: name }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setErr(d.error || 'Could not sign. Please try again.'); return; }
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary mt-6">
        Sign this agreement
      </button>
    );
  }

  return (
    <div className="mt-6 rounded-xl border border-gleam/30 bg-gleam/5 p-5">
      <h4 className="font-display text-lg">Sign agreement</h4>
      <div className="mt-4 space-y-3">
        <div>
          <label className="label">Full name (typed signature)</label>
          <input
            className="field"
            placeholder="Your full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <label className="flex items-start gap-2 text-sm text-ink-300">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          I confirm I am authorized to execute this service agreement on behalf of {operatorName} and agree to the terms above.
        </label>
        {err && <div className="text-sm text-red-400">{err}</div>}
        <div className="flex gap-2 pt-1">
          <button
            onClick={sign}
            disabled={!name || !confirmed || busy}
            className="btn-primary text-sm"
          >
            {busy ? 'Signing…' : 'Sign & submit'}
          </button>
          <button onClick={() => setOpen(false)} className="btn-quiet text-sm">Cancel</button>
        </div>
      </div>
    </div>
  );
}
