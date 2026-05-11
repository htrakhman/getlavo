'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function OperatorStatusEditor({ operatorId, status }: { operatorId: string; status: string }) {
  const router = useRouter();
  const [s, setS] = useState(status);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    await fetch(`/api/admin/operators/${operatorId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: s, rejectionReason: s === 'rejected' ? reason : undefined }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2 md:flex-row">
      <select className="field md:w-48" value={s} onChange={(e) => setS(e.target.value)}>
        <option value="pending_review">Pending review</option>
        <option value="approved">Approved</option>
        <option value="suspended">Suspended</option>
        <option value="rejected">Rejected</option>
      </select>
      {s === 'rejected' && (
        <input className="field flex-1" placeholder="Rejection reason" value={reason} onChange={(e) => setReason(e.target.value)} />
      )}
      <button onClick={save} disabled={busy} className="btn-primary text-sm">{busy ? '…' : 'Save'}</button>
    </div>
  );
}
