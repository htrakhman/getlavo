'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { REFUND_WINDOW_HOURS, isRefundableCancellation } from '@/lib/cancellation-policy';

/**
 * Cancelling a wash, and saying up front what it costs.
 *
 * The confirm step used to read "Cancel and refund?" for every booking, which
 * promised money back on a wash cancelled an hour before the crew arrives — the
 * server refunds only outside the 24-hour window. Both read the same policy
 * module, so the question the resident answers is the one the API will apply.
 */
export function CancelBookingButton({
  bookingId,
  scheduledFor,
  timeSlot,
}: {
  bookingId: string;
  scheduledFor: string;
  timeSlot?: string | null;
}) {
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

  // Decided when the resident opens the confirm step, off their own clock. The
  // server re-decides on the request, so a stale tab can't talk it into a refund.
  const refundable = isRefundableCancellation(scheduledFor, timeSlot);

  return (
    <div className="text-right space-y-1">
      <p className="text-xs text-ink-400">{refundable ? 'Cancel and refund?' : 'Cancel without a refund?'}</p>
      {!refundable && (
        <p className="text-[11px] text-ink-500">
          This wash is within {REFUND_WINDOW_HOURS} hours, so the charge stands.
        </p>
      )}
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
