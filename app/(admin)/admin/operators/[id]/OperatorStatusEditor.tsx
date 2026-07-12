'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function OperatorStatusEditor({
  operatorId,
  status,
  stripeOnboardingComplete,
}: {
  operatorId: string;
  status: string;
  stripeOnboardingComplete: boolean;
}) {
  const router = useRouter();
  const [s, setS] = useState(status);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [stripeBusy, setStripeBusy] = useState(false);

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

  async function toggleStripe() {
    setStripeBusy(true);
    await fetch(`/api/admin/operators/${operatorId}/stripe-complete`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ complete: !stripeOnboardingComplete }),
    });
    setStripeBusy(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
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
      <div className="flex items-center gap-3">
        <span className="text-sm text-ink-400">Stripe onboarding:</span>
        <span className={`chip text-xs ${stripeOnboardingComplete ? 'bg-green-900/40 text-green-300' : 'bg-red-900/40 text-red-300'}`}>
          {stripeOnboardingComplete ? 'Complete' : 'Incomplete'}
        </span>
        <button onClick={toggleStripe} disabled={stripeBusy} className="btn-ghost text-xs">
          {stripeBusy ? '…' : stripeOnboardingComplete ? 'Mark incomplete' : 'Mark complete'}
        </button>
      </div>
    </div>
  );
}
