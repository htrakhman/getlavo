'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ProposeWashDay({ buildings }: { buildings: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [buildingId, setBuildingId] = useState(buildings[0]?.id ?? '');
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setErr(null);
    const res = await fetch('/api/wash-days/propose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buildingId, scheduledFor: date }),
    });
    setBusy(false);
    if (!res.ok) { setErr('Could not propose'); return; }
    setOpen(false);
    setDate('');
    router.refresh();
  }

  if (!open) return <button onClick={() => setOpen(true)} className="btn-primary">+ Propose wash day</button>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
      <div className="card w-full max-w-md p-6">
        <h3 className="font-display text-xl">Propose a wash day</h3>
        <p className="mt-1 text-xs text-ink-500">The building manager confirms before residents are notified.</p>
        <div className="mt-4 space-y-3">
          <div>
            <label className="label">Building</label>
            <select className="field" value={buildingId} onChange={(e) => setBuildingId(e.target.value)}>
              {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Date</label>
            <input className="field" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        {err && <div className="mt-3 text-sm text-red-400">{err}</div>}
        <div className="mt-6 flex gap-2">
          <button onClick={submit} disabled={busy || !date || !buildingId} className="btn-primary text-sm">
            {busy ? '…' : 'Send proposal'}
          </button>
          <button onClick={() => setOpen(false)} className="btn-quiet text-sm">Cancel</button>
        </div>
      </div>
    </div>
  );
}
