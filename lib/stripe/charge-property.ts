/**
 * Charge a property's card on file for its share of a wash.
 *
 * Structurally identical to a resident payment: a Connect destination charge
 * that pays the operator their share and collects Lavo's fee as an application
 * fee. The operator is paid the same way and on the same timing whoever the
 * payer is — that is the point of doing it this way rather than invoicing the
 * property later, which would leave the operator waiting or Lavo fronting the
 * cash.
 *
 * The card is charged off-session: nobody from the property is at a keyboard
 * when an occupant books. A card that needs authentication therefore fails
 * rather than prompting, and the caller has to decide what that means — see
 * the result type.
 */
import Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveSplit, destinationChargeParams } from '@/lib/stripe/connect-split';
import { logError } from '@/lib/error-log';

export type PropertyChargeResult =
  | { ok: true; paymentIntentId: string; amountCents: number }
  | { ok: false; error: string; needsAction?: boolean };

export async function chargePropertyForWash(
  admin: SupabaseClient,
  args: {
    bookingId: string;
    buildingId: string;
    amountCents: number;
    customerId: string | null;
    paymentMethodId: string | null;
    /** The operator's connected account — their share has to have somewhere to go. */
    operatorStripeAccountId: string | null;
    description: string;
  },
): Promise<PropertyChargeResult> {
  const amount = Math.round(args.amountCents);
  if (amount <= 0) return { ok: false, error: 'Nothing to charge the property.' };
  if (!process.env.STRIPE_SECRET_KEY) return { ok: false, error: 'Payments are not configured.' };
  if (!args.customerId || !args.paymentMethodId) {
    return { ok: false, error: 'This property has no card on file.' };
  }
  // Mirrors the resident path: never take 100% of a payment the operator is
  // owed a share of just because the destination is missing.
  if (!args.operatorStripeAccountId) {
    return { ok: false, error: 'The operator has not connected a payout account.' };
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
  const split = resolveSplit(amount);

  try {
    const intent = await stripe.paymentIntents.create(
      {
        amount,
        currency: 'usd',
        customer: args.customerId,
        payment_method: args.paymentMethodId,
        off_session: true,
        confirm: true,
        description: args.description,
        ...destinationChargeParams(split, args.operatorStripeAccountId),
        metadata: {
          booking_id: args.bookingId,
          building_id: args.buildingId,
          payer: 'property',
        },
      },
      // Two bookings must never collide into one charge, and a retried request
      // must not double-bill the property for the same booking.
      { idempotencyKey: `property-wash-${args.bookingId}` },
    );

    if (intent.status !== 'succeeded') {
      return {
        ok: false,
        error: `Card was not charged (${intent.status}).`,
        needsAction: intent.status === 'requires_action',
      };
    }
    return { ok: true, paymentIntentId: intent.id, amountCents: amount };
  } catch (e: any) {
    // An off-session card that needs authentication surfaces here, not as a
    // status — the property has to come back and re-authorise it.
    const needsAction = e?.code === 'authentication_required';
    const message = e?.message ?? String(e);
    void logError({
      source: 'stripe.charge-property',
      message,
      context: { bookingId: args.bookingId, buildingId: args.buildingId, amount, code: e?.code },
    });
    return { ok: false, error: message, needsAction };
  }
}
