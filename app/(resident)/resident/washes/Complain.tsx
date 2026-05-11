'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const REASONS = [
  'Wash quality was poor',
  'Damage to my vehicle',
  'Crew was unprofessional',
  'Wash was missed',
  'Other',
];

export function Complain({ washId }: { washId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    setBusy(true);
    await fetch(`/api/wash-records/${washId}/complain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, details }),
    });
    setBusy(false);
    setDone(true);
    router.refresh();
  }

  if (done) {
    return <div className="mt-2 text-xs text-gleam">Reported. We'll follow up within 24 hours.</div>;
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="mt-2 text-xs text-ink-400 hover:text-red-400">
        Report a problem
      </button>
    );
  }

  return (
    <div className="mt-3 card border-red-500/30 p-3">
      <select className="field text-xs" value={reason} onChange={(e) => setReason(e.target.value)}>
        {REASONS.map((r) => <option key={r}>{r}</option>)}
      </select>
      <textarea
        className="field mt-2 min-h-16 text-xs"
        placeholder="Tell us what happened (optional)"
        value={details}
        onChange={(e) => setDetails(e.target.value)}
      />
      <div className="mt-2 flex gap-2">
        <button onClick={submit} disabled={busy} className="btn-primary text-xs">{busy ? '…' : 'Submit'}</button>
        <button onClick={() => setOpen(false)} className="btn-quiet text-xs">Cancel</button>
      </div>
    </div>
  );
}
