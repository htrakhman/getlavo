'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function RescheduleButton({ washDayId, currentDate }: { washDayId: string; currentDate: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(currentDate);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    const res = await fetch(`/api/wash-days/${washDayId}/reschedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newDate: date }),
    });
    setBusy(false);
    if (!res.ok) { alert('Could not reschedule'); return; }
    setOpen(false);
    router.refresh();
  }

  if (!open) return <button onClick={() => setOpen(true)} className="btn-quiet text-sm">Reschedule</button>;

  return (
    <div className="card border-amber-400/30 p-4">
      <p className="text-sm">Pick a new date. The building manager will be asked to re-confirm.</p>
      <div className="mt-3 flex gap-2">
        <input type="date" className="field text-sm" value={date} onChange={(e) => setDate(e.target.value)} />
        <button onClick={submit} disabled={busy || !date || date === currentDate} className="btn-primary text-sm">
          {busy ? '…' : 'Save'}
        </button>
        <button onClick={() => setOpen(false)} className="btn-quiet text-sm">Cancel</button>
      </div>
    </div>
  );
}
