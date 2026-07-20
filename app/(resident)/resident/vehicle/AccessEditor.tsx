'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function AccessEditor({
  residentId,
  notes,
}: {
  residentId: string;
  notes: string | null;
}) {
  const router = useRouter();
  const [n, setN] = useState(notes ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save() {
    setBusy(true);
    setErr(null);
    // Saved through a server route: direct browser writes are RLS-scoped and
    // were silently failing in production.
    const res = await fetch('/api/residents/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vehicleAccessMethod: 'front_desk',
        vehicleAccessNotes: n || null,
      }),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      const j = await res?.json().catch(() => null);
      setErr(typeof j?.error === 'string' ? j.error : 'Could not save — please try again');
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  return (
    <div className="card p-6 space-y-4">
      <h3 className="font-display text-xl">Vehicle access</h3>
      <p className="text-sm text-ink-200">
        Leave your keys with the front desk before your scheduled service.
      </p>
      <p className="text-xs text-ink-500">
        If keys are not provided to the front desk prior to your service, the operator will not be
        able to service your vehicle and a refund will not be given.
      </p>
      <div>
        <label className="label">Details <span className="text-ink-500">(optional)</span></label>
        <textarea className="field min-h-[88px]" value={n} onChange={(e) => setN(e.target.value)} placeholder="Anything else the crew should know" />
      </div>
      <button type="button" disabled={busy} className="btn-primary text-sm" onClick={() => save()}>
        {busy ? 'Saving…' : saved ? 'Saved ✓' : 'Save access info'}
      </button>
      {err && <p className="text-sm text-red-400">{err}</p>}
    </div>
  );
}
