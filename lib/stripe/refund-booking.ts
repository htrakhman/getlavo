import Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Give a resident their money back — the whole way back.
 *
 * Every resident payment is a Connect *destination charge*: Stripe has already
 * moved the operator's ~90% into their connected account and booked Lavo's cut
 * as an application fee (see lib/stripe/connect-split.ts). A plain
 * `refunds.create({ payment_intent })` returns the full amount to the resident
 * out of Lavo's balance and leaves both of those alone — the operator keeps
 * their share of a wash that never happened, and Lavo pays for it. The resident
 * cancel route did exactly that, so every self-serve cancellation quietly cost
 * Lavo the operator's cut on top of the refund.
 *
 * Both refund paths (resident cancellation, admin refund) run through here so
 * they can't drift apart again.
 */

export type RefundOutcome =
  /** A refund was issued by this call. */
  | 'refunded'
  /** The money was already back before this call — a repeat click, or a dashboard refund. */
  | 'already_refunded'
  /** Nothing was ever captured, so there is nothing to return. */
  | 'nothing_captured';

export type RefundResult =
  | { ok: true; outcome: RefundOutcome; refundId: string | null }
  | { ok: false; error: string };

/** Stripe's answer when the money is already back. Not a failure — the goal is met. */
function isAlreadyRefunded(err: any): boolean {
  return err?.code === 'charge_already_refunded';
}

/**
 * Refund a booking's payment in full, reversing the operator transfer and
 * Lavo's application fee with it.
 *
 * `reverse_transfer` and `refund_application_fee` are both conditional: Stripe
 * rejects either one on a charge that never carried the corresponding object,
 * which is every booking taken before the split started stating an application
 * fee. Asking the charge first keeps those old bookings refundable instead of
 * erroring out.
 *
 * Idempotent by design — a resident double-clicking "Yes, cancel" gets one
 * refund and a successful second answer, rather than a 500 that leaves the
 * booking confirmed with the money already gone.
 */
export async function refundBookingPayment(
  admin: SupabaseClient,
  args: { bookingId: string; paymentIntentId: string },
): Promise<RefundResult> {
  if (!process.env.STRIPE_SECRET_KEY) {
    return { ok: false, error: 'Payments are not configured.' };
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

  let hasApplicationFee = false;
  let hasTransfer = false;
  try {
    const intent = await stripe.paymentIntents.retrieve(args.paymentIntentId, {
      expand: ['latest_charge'],
    });
    const charge = intent.latest_charge as Stripe.Charge | null;

    // A booking whose checkout was started but never completed carries a
    // payment intent and no charge. Asking Stripe to refund it fails, and the
    // failure would block a cancellation the resident is entitled to — nothing
    // was taken from them in the first place.
    if (!charge || !charge.captured) {
      return { ok: true, outcome: 'nothing_captured', refundId: null };
    }

    hasApplicationFee = !!charge.application_fee;
    hasTransfer = !!charge.transfer;

    if (charge.refunded) {
      await markChargeRefunded(admin, args.bookingId);
      return { ok: true, outcome: 'already_refunded', refundId: null };
    }
  } catch (e: any) {
    // Couldn't read the charge — try the refund anyway rather than stranding a
    // resident's money behind a transient Stripe read. The conditional flags
    // stay off, which is the shape an older, pre-split booking needs.
    console.error('[refund-booking] could not read the charge before refunding', {
      bookingId: args.bookingId,
      message: e?.message,
    });
  }

  try {
    const refund = await stripe.refunds.create({
      payment_intent: args.paymentIntentId,
      reason: 'requested_by_customer',
      ...(hasTransfer ? { reverse_transfer: true } : {}),
      ...(hasApplicationFee ? { refund_application_fee: true } : {}),
    });
    await markChargeRefunded(admin, args.bookingId);
    return { ok: true, outcome: 'refunded', refundId: refund.id };
  } catch (e: any) {
    if (isAlreadyRefunded(e)) {
      await markChargeRefunded(admin, args.bookingId);
      return { ok: true, outcome: 'already_refunded', refundId: null };
    }
    console.error('[refund-booking] stripe refund failed', {
      bookingId: args.bookingId,
      code: e?.code,
      message: e?.message,
    });
    return { ok: false, error: e?.message ?? 'The refund could not be issued.' };
  }
}

/**
 * A refunded booking's mirrored charge is no longer money the operator earned.
 * Never fatal: the resident has their money back either way, and a stale ledger
 * row is a reporting problem, not a payment one.
 */
async function markChargeRefunded(admin: SupabaseClient, bookingId: string) {
  const { error } = await admin
    .from('charges')
    .update({ status: 'refunded' })
    .eq('booking_id', bookingId);
  if (error) {
    console.error('[refund-booking] could not mark the charge refunded', {
      bookingId,
      message: error.message,
    });
  }
}
