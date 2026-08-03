'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CANCELLATION_CUTOFF_HOURS,
  formatInZone,
  refundEligibility,
} from '@/lib/cancellation-policy';

/**
 * Cancelling a wash, with the refund stated before the money moves.
 *
 * The confirm step used to read "Cancel and refund?" on every booking, whatever
 * the timing — which promised a refund on a wash starting in an hour, and the
 * server issued one. Now the prompt is whichever is true: a full refund outside
 * the 24-hour window, or an explicit no-refund confirmation inside it.
 *
 * The window is computed here only to word the prompt. The server decides, and
 * a tab left open across the deadline gets a 409 back that flips this into the
 * no-refund prompt instead of silently forfeiting the payment.
 */
export function CancelBookingButton({
  bookingId,
  scheduledFor,
  timeSlot,
}: {
  bookingId: string;
  scheduledFor: string;
  timeSlot: string | null;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Starts from the client's own read of the window; corrected by the server if
  // the deadline passed while this page was sitting open.
  const [refundable, setRefundable] = useState(
    () => refundEligibility(scheduledFor, timeSlot).refundable,
  );

  async function doCancel() {
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Only ever sent from the prompt that says the booking isn't refundable,
      // so the acknowledgment matches what the resident actually read.
      body: JSON.stringify({ acknowledgeNoRefund: !refundable }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      if (d.requiresAcknowledgement) setRefundable(false);
      setErr(d.error || 'Could not cancel. Please try again.');
      return;
    }
    setConfirming(false);
    router.refresh();
  }

  if (!confirming) {
    return (
      <button
        onClick={() => {
          // Re-read on open: this page may have been sitting past the deadline.
          setRefundable(refundEligibility(scheduledFor, timeSlot).refundable);
          setErr(null);
          setConfirming(true);
        }}
        className="text-xs text-ink-500 hover:text-red-400 transition"
      >
        Cancel
      </button>
    );
  }

  const deadline = refundEligibility(scheduledFor, timeSlot).deadline;

  return (
    <div className="text-right space-y-1">
      <p className="text-xs text-ink-400">
        {refundable ? 'Cancel and refund?' : 'Cancel without a refund?'}
      </p>
      <p className="text-[11px] text-ink-500">
        {refundable
          ? `Your payment goes back to your original payment method.${
              deadline ? ` Free until ${formatInZone(deadline)}.` : ''
            }`
          : `Your wash starts in under ${CANCELLATION_CUTOFF_HOURS} hours, so this booking can’t be refunded. Your operator will be told either way.`}
      </p>
      {err && <p className="text-xs text-red-400">{err}</p>}
      <div className="flex gap-2 justify-end">
        <button
          onClick={doCancel}
          disabled={busy}
          className="text-xs text-red-400 hover:text-red-500 transition font-medium"
        >
          {busy ? 'Cancelling…' : refundable ? 'Yes, cancel and refund' : 'Yes, cancel without refund'}
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
