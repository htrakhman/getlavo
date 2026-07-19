'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function doCancel() {
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/bookings/${bookingId}/cancel`, { method: 'POST' });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setErr(d.error || 'Could not cancel. Please try again.'); return; }
    setConfirming(false);
    router.refresh();
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="text-xs text-ink-500 hover:text-red-400 transition"
      >
        Cancel
      </button>
    );
  }

  return (
    <div className="text-right space-y-1">
      <p className="text-xs text-ink-400">Cancel and refund?</p>
      {err && <p className="text-xs text-red-400">{err}</p>}
      <div className="flex gap-2 justify-end">
        <button
          onClick={doCancel}
          disabled={busy}
          className="text-xs text-red-400 hover:text-red-500 transition font-medium"
        >
          {busy ? 'Cancelling…' : 'Yes, cancel'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs text-ink-500 hover:text-ink-300 transition"
        >
          Keep it
        </button>
      </div>
    </div>
  );
}
