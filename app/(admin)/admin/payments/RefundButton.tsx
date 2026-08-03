'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function RefundButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function refund() {
    if (!confirm('Refund this booking in full? Will reverse the operator transfer and the platform fee.')) return;
    setBusy(true);
    const res = await fetch('/api/admin/refund', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId }),
    });
    setBusy(false);
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(d.error ?? 'Refund failed');
      return;
    }
    // Not every successful call moves money — say which happened rather than
    // leaving an admin to assume a refund went out when none did.
    if (d.outcome === 'already_refunded') alert('Already refunded — nothing further was charged back.');
    if (d.outcome === 'nothing_captured') alert('No captured payment on this booking — nothing to refund. Marked cancelled.');
    router.refresh();
  }

  return (
    <button onClick={refund} disabled={busy} className="text-xs text-red-500 hover:text-red-600">
      {busy ? '…' : 'Refund'}
    </button>
  );
}
