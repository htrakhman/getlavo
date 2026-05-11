'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ReviewActions({ operatorId }: { operatorId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');

  async function call(decision: 'approved' | 'rejected', noteText?: string) {
    setBusy(true);
    await fetch(`/api/admin/insurance/${operatorId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, note: noteText }),
    });
    setBusy(false);
    setRejecting(false);
    setNote('');
    router.refresh();
  }

  if (rejecting) {
    return (
      <div className="flex flex-col gap-2 items-end">
        <input className="field text-xs w-64" placeholder="Reason for rejection" value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="flex gap-2">
          <button onClick={() => call('rejected', note)} disabled={busy || !note} className="btn-primary !bg-red-500 !text-white text-sm">Send</button>
          <button onClick={() => setRejecting(false)} className="btn-quiet text-sm">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <button onClick={() => call('approved')} disabled={busy} className="btn-primary text-sm">Approve</button>
      <button onClick={() => setRejecting(true)} disabled={busy} className="btn-quiet text-sm">Reject</button>
    </div>
  );
}
