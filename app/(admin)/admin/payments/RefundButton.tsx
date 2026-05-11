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
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d.error ?? 'Refund failed');
      return;
    }
    router.refresh();
  }

  return (
    <button onClick={refund} disabled={busy} className="text-xs text-red-300 hover:text-red-400">
      {busy ? '…' : 'Refund'}
    </button>
  );
}
