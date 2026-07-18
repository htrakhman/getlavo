'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function AccessEditor({
  residentId,
  method,
  notes,
}: {
  residentId: string;
  method: string | null;
  notes: string | null;
}) {
  const router = useRouter();
  const [m, setM] = useState(method ?? '');
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
        vehicleAccessMethod: m || null,
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
      <div>
        <label className="label">How should the operator access your car?</label>
        <select className="field" value={m} onChange={(e) => setM(e.target.value)}>
          <option value="">Not set</option>
          <option value="guest_spot">Guest spot</option>
          <option value="lockbox">Lockbox</option>
          <option value="home">I will be home</option>
          <option value="doorman">Doorman has key</option>
          <option value="instructions">Custom instructions</option>
        </select>
      </div>
      <div>
        <label className="label">Details</label>
        <textarea className="field min-h-[88px]" value={n} onChange={(e) => setN(e.target.value)} placeholder="Codes, landmarks, anything the crew needs" />
      </div>
      <button type="button" disabled={busy} className="btn-primary text-sm" onClick={() => save()}>
        {busy ? 'Saving…' : saved ? 'Saved ✓' : 'Save access info'}
      </button>
      {err && <p className="text-sm text-red-400">{err}</p>}
    </div>
  );
}
