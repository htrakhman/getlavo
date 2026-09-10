/**
 * Call off a wash day that never reached its minimum.
 *
 * The operator is not standing anyone up here — the platform is releasing a day
 * that could not earn its trip, and it owes every resident who booked it their
 * money and an explanation. Refunds run through refundBookingPayment so the
 * operator's transfer and Lavo's application fee are reversed with them: a day
 * that never happened costs the resident, the operator and Lavo nothing.
 *
 * The resident's own 24-hour window does not apply. They did not cancel this.
 */
import { supabaseAdmin } from '@/lib/supabase/admin';
import { refundBookingPayment } from '@/lib/stripe/refund-booking';
import { notifyCancelled } from '@/lib/booking-cancel';
import { logError } from '@/lib/error-log';

export type WashDayCancelResult = {
  washDayId: string;
  cancelled: boolean;
  bookingsCancelled: number;
  refunded: number;
  refundFailures: number;
};

/**
 * Cancel one wash day and unwind every booking on it.
 *
 * Idempotent: a day already carrying `cancelled_at` is left alone, so a retried
 * sweep cannot refund twice or send a second round of emails.
 */
export async function cancelWashDayForMinimum(
  washDayId: string,
  reason: string,
): Promise<WashDayCancelResult> {
  const admin = supabaseAdmin();
  const result: WashDayCancelResult = {
    washDayId,
    cancelled: false,
    bookingsCancelled: 0,
    refunded: 0,
    refundFailures: 0,
  };

  const { data: washDay } = await admin
    .from('wash_days')
    .select('id, cancelled_at, completed_at')
    .eq('id', washDayId)
    .maybeSingle();
  if (!washDay || washDay.cancelled_at || washDay.completed_at) return result;

  // Claim the day first. Marking it before the refunds means a crash midway
  // cannot leave a day that looks open and is quietly half-refunded, and the
  // conditional update makes two concurrent sweeps race safely — only one wins.
  const { data: claimed } = await admin
    .from('wash_days')
    .update({ cancelled_at: new Date().toISOString(), cancellation_reason: reason })
    .eq('id', washDayId)
    .is('cancelled_at', null)
    .select('id');
  if (!claimed?.length) return result;
  result.cancelled = true;

  const { data: bookings } = await admin
    .from('bookings')
    .select('id, status, stripe_payment_intent_id')
    .eq('wash_day_id', washDayId)
    .in('status', ['pending_payment', 'confirmed']);

  for (const booking of bookings ?? []) {
    let refunded = false;

    if (booking.stripe_payment_intent_id) {
      const outcome = await refundBookingPayment(admin, {
        bookingId: booking.id,
        paymentIntentId: booking.stripe_payment_intent_id,
      });
      if (outcome.ok) {
        refunded = outcome.outcome !== 'nothing_captured';
        if (refunded) result.refunded += 1;
      } else {
        result.refundFailures += 1;
        // The wash is off either way — the resident must not be left expecting
        // a crew because their money is stuck. Flagged loudly for manual repair.
        void logError({
          source: 'wash-day.cancel.refund',
          message: outcome.error,
          context: { washDayId, bookingId: booking.id },
        });
      }
    }

    await admin
      .from('bookings')
      .update({ status: 'cancelled', cancellation_fee_cents: 0 })
      .eq('id', booking.id);
    result.bookingsCancelled += 1;

    // Same notification the resident gets for any called-off wash: email, inbox
    // row, and a calendar cancel that takes the appointment back off.
    await notifyCancelled(admin, booking.id, { refunded }).catch((e) =>
      console.error('wash-day cancel: notify failed', booking.id, e),
    );
  }

  return result;
}
