'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  contractId: string;
  buildingName: string;
  alreadySigned?: boolean;
}

type Mode = 'idle' | 'sign' | 'reject';

export function ContractDraftSigner({ contractId, buildingName, alreadySigned }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('idle');
  const [name, setName] = useState('');
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
    setMode('idle');
    router.refresh();
  }

  async function reject() {
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/contracts/${contractId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setErr(d.error || 'Could not decline. Please try again.'); return; }
    setMode('idle');
    router.refresh();
  }

  if (alreadySigned) {
    return (
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <div className="inline-flex items-center gap-2 text-gleam text-sm">
          <span>✓</span> You&rsquo;ve accepted this agreement — awaiting operator signature
        </div>
        <a href={`/api/contracts/${contractId}/pdf`} target="_blank" rel="noreferrer" className="text-xs text-gleam hover:underline">
          View PDF →
        </a>
      </div>
    );
  }

  if (mode === 'sign') {
    return (
      <div className="mt-6 rounded-xl border border-gleam/30 bg-gleam/5 p-5">
        <h4 className="font-display text-lg">Accept & sign agreement</h4>
        <div className="mt-4 space-y-3">
          <div>
            <label className="label">Full name (typed signature)</label>
            <input className="field" placeholder="Your full name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <label className="flex items-start gap-2 text-sm text-ink-300">
            <input type="checkbox" className="mt-0.5" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
            I confirm I am authorized to execute this service agreement on behalf of {buildingName} and agree to the terms above.
          </label>
          {err && <div className="text-sm text-red-400">{err}</div>}
          <div className="flex gap-2 pt-1">
            <button onClick={sign} disabled={!name || !confirmed || busy} className="btn-primary text-sm">
              {busy ? 'Signing…' : 'Sign & submit'}
            </button>
            <button onClick={() => { setMode('idle'); setErr(null); }} className="btn-quiet text-sm">Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'reject') {
    return (
      <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/5 p-5">
        <h4 className="font-display text-lg">Decline agreement</h4>
        <p className="mt-1 text-sm text-ink-400">The operator will be notified. You can accept a new agreement later.</p>
        <div className="mt-4 space-y-3">
          <div>
            <label className="label">Reason (optional)</label>
            <input className="field" placeholder="Let them know why (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          {err && <div className="text-sm text-red-400">{err}</div>}
          <div className="flex gap-2 pt-1">
            <button onClick={reject} disabled={busy} className="btn-primary bg-red-500 text-sm hover:bg-red-600">
              {busy ? 'Declining…' : 'Confirm decline'}
            </button>
            <button onClick={() => { setMode('idle'); setErr(null); }} className="btn-quiet text-sm">Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      <button onClick={() => setMode('sign')} className="btn-primary">Accept &amp; sign</button>
      <button onClick={() => setMode('reject')} className="btn-quiet text-red-400">Decline</button>
      <a href={`/api/contracts/${contractId}/pdf`} target="_blank" rel="noreferrer" className="text-sm text-gleam hover:underline">
        View PDF →
      </a>
    </div>
  );
}
