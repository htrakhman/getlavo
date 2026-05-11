'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const TYPES = ['Missed wash', 'Damage concern', 'Scheduling problem', 'Resident complaint', 'Other'];

export function ReportIssue({ buildingId }: { buildingId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState(TYPES[0]);
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setErr(null);
    const res = await fetch('/api/issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buildingId, type, description }),
    });
    setBusy(false);
    if (!res.ok) { setErr('Could not submit'); return; }
    setOpen(false);
    setDescription('');
    router.refresh();
  }

  if (!open) {
    return <button onClick={() => setOpen(true)} className="btn-primary">Report an issue</button>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
      <div className="card w-full max-w-md p-6">
        <h3 className="font-display text-xl">Report an issue</h3>
        <div className="mt-4 space-y-3">
          <div>
            <label className="label">Type</label>
            <select className="field" value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="field min-h-24" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          {err && <div className="text-sm text-red-400">{err}</div>}
          <div className="flex gap-2">
            <button onClick={submit} disabled={busy || !description.trim()} className="btn-primary text-sm">
              {busy ? 'Submitting…' : 'Submit'}
            </button>
            <button onClick={() => setOpen(false)} className="btn-quiet text-sm">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}
