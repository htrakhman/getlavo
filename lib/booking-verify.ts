import type { SupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { confirmPaidBookingAndNotify } from '@/lib/booking-confirm';
import { recordPromoRedemption } from '@/lib/promo';

export type BookingVerifyResult = {
  confirmed: boolean;
  reason: 'not_found' | 'already_processed' | 'stripe_error' | 'unpaid' | 'verified';
};

/**
 * Redirect-time fallback for the Stripe webhook.
 *
 * The webhook (checkout.session.completed) is the primary confirmation path,
 * but if the endpoint isn't registered or the signing secret is wrong, paid
 * bookings stay pending_payment forever. This asks Stripe directly whether
 * the booking's checkout was paid and, if so, confirms it the same way the
 * webhook would. Idempotent — safe to call on every success redirect.
 */
export async function verifyAndConfirmBookingPayment(
  admin: SupabaseClient,
  bookingId: string,
): Promise<BookingVerifyResult> {
  const { data: booking } = await admin
    .from('bookings')
    .select(
      'id, status, paid_at, stripe_checkout_session_id, stripe_payment_intent_id, promo_code_id, resident:residents(profile_id)',
    )
    .eq('id', bookingId)
    .maybeSingle();
  if (!booking) return { confirmed: false, reason: 'not_found' };
  if (booking.status !== 'pending_payment') {
    return {
      confirmed: booking.status === 'confirmed' || !!booking.paid_at,
      reason: 'already_processed',
    };
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });

  let paid = false;
  let paymentIntentId: string | null = booking.stripe_payment_intent_id ?? null;

  try {
    if (booking.stripe_checkout_session_id) {
      const session = await stripe.checkout.sessions.retrieve(booking.stripe_checkout_session_id);
      paid = session.payment_status === 'paid' || session.payment_status === 'no_payment_required';
      if (typeof session.payment_intent === 'string') paymentIntentId = session.payment_intent;
    } else if (paymentIntentId) {
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
      paid = pi.status === 'succeeded';
    } else {
      // Bookings created before the checkout session id was stored: the
      // PaymentIntent carries booking_id in its metadata, so search for it.
      const found = await stripe.paymentIntents.search({
        query: `metadata['booking_id']:'${bookingId}'`,
        limit: 1,
      });
      const pi = found.data[0];
      if (pi?.status === 'succeeded') {
        paid = true;
        paymentIntentId = pi.id;
      }
    }
  } catch (err) {
    console.error('[booking-verify] Stripe lookup failed', {
      bookingId,
      message: err instanceof Error ? err.message : String(err),
    });
    return { confirmed: false, reason: 'stripe_error' };
  }

  if (!paid) return { confirmed: false, reason: 'unpaid' };

  await confirmPaidBookingAndNotify(admin, bookingId, paymentIntentId);

  const profileId = (booking.resident as any)?.profile_id as string | undefined;
  if (booking.promo_code_id && profileId) {
    await recordPromoRedemption(admin, {
      promoId: booking.promo_code_id,
      profileId,
      bookingId,
    });
  }

  return { confirmed: true, reason: 'verified' };
}
