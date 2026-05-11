'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ConfirmProposal({ washDayId }: { washDayId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function decide(decision: 'confirmed' | 'declined') {
    setBusy(true);
    await fetch(`/api/wash-days/${washDayId}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <button onClick={() => decide('confirmed')} disabled={busy} className="btn-primary text-sm">
        {busy ? '…' : 'Confirm date'}
      </button>
      <button onClick={() => decide('declined')} disabled={busy} className="btn-quiet text-sm">
        Decline
      </button>
    </div>
  );
}
