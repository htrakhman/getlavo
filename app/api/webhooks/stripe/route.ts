import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { confirmPaidBookingAndNotify } from '@/lib/booking-confirm';
import { recordPromoRedemption } from '@/lib/promo';
import { notify } from '@/lib/notify';
import { getBuildingBilling } from '@/lib/billing-for-building';
import { chargePropertyForWash } from '@/lib/stripe/charge-property';
import { logError } from '@/lib/error-log';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2024-06-20' });
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? '';

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature') ?? '';

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error('[webhooks/stripe] signature verification failed', {
      hasSecret: !!webhookSecret,
      hasSignatureHeader: !!sig,
      message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const admin = supabaseAdmin();

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const addonOrderId = session.metadata?.addon_order_id;
    const bookingId = session.metadata?.booking_id;
    const residentIdMeta = session.metadata?.resident_id;
    const subscriptionTier = session.metadata?.subscription_tier;

    if (addonOrderId) {
      await admin
        .from('addon_orders')
        .update({
          paid_at: new Date().toISOString(),
          stripe_payment_intent_id:
            typeof session.payment_intent === 'string' ? session.payment_intent : null,
        })
        .eq('id', addonOrderId);
    } else if (session.mode === 'subscription' && residentIdMeta && session.subscription) {
      const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
      await admin
        .from('residents')
        .update({
          stripe_subscription_id: subId,
          subscription_tier: subscriptionTier ?? null,
          subscription_state: 'active',
        })
        .eq('id', residentIdMeta);
    } else if (bookingId && session.mode === 'payment') {
      const piId =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : (session.payment_intent as Stripe.PaymentIntent | null)?.id ?? null;

      await confirmPaidBookingAndNotify(admin, bookingId, piId);

      // A property sharing the cost is charged only now, once the occupant has
      // actually paid their half. Charging at booking time would bill the
      // property for every abandoned checkout — the occupant walks away and the
      // property is left paying for a wash nobody booked.
      await chargePropertyShareIfOwed(admin, bookingId);

      const { data: b } = await admin
        .from('bookings')
        .select('promo_code_id, resident:residents(profile_id)')
        .eq('id', bookingId)
        .maybeSingle();
      const promoId = session.metadata?.promo_code_id ?? (b as any)?.promo_code_id;
      const profileId = (b as any)?.resident?.profile_id as string | undefined;
      if (promoId && profileId) {
        await recordPromoRedemption(admin, { promoId, profileId, bookingId });
      }
    }
  }

  if (event.type === 'account.updated') {
    const account = event.data.object as Stripe.Account;
    const complete = !!account.charges_enabled && !!account.payouts_enabled;
    await admin.from('operators').update({ stripe_onboarding_complete: complete }).eq('stripe_account_id', account.id);
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription;
    await admin
      .from('residents')
      .update({
        stripe_subscription_id: null,
        subscription_tier: null,
        subscription_state: 'cancelled',
        subscription_cancelled_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', sub.id);
  }

  if (event.type === 'customer.subscription.updated') {
    const sub = event.data.object as Stripe.Subscription;
    const status = sub.status;
    const state =
      status === 'active' || status === 'trialing'
        ? 'active'
        : status === 'paused'
          ? 'paused'
          : 'cancelled';
    await admin
      .from('residents')
      .update({ subscription_state: state })
      .eq('stripe_subscription_id', sub.id);
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as Stripe.PaymentIntent;
    const washId = pi.metadata?.wash_id;
    if (washId) {
      await admin
        .from('bookings')
        .update({
          status: 'completed',
          paid_at: new Date().toISOString(),
          stripe_payment_intent_id: pi.id,
        })
        .eq('stripe_payment_intent_id', pi.id);
      await admin
        .from('charges')
        .update({ status: 'succeeded', stripe_payment_intent_id: pi.id, failure_reason: null })
        .eq('wash_id', washId);
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const pi = event.data.object as Stripe.PaymentIntent;
    const washId = pi.metadata?.wash_id;
    if (washId) {
      await admin
        .from('charges')
        .update({
          status: 'failed',
          failure_reason: pi.last_payment_error?.message ?? 'payment failed',
        })
        .eq('wash_id', washId);
      const { data: wash } = await admin
        .from('washes')
        .select('resident:residents(profile_id)')
        .eq('id', washId)
        .maybeSingle();
      const profileId = (wash?.resident as any)?.profile_id;
      if (profileId) {
        await notify(profileId, 'payment_failed', { link: '/resident/payment' });
      }
    }
  }

  return NextResponse.json({ ok: true });
}

/**
 * Charge the property its share of a booking the occupant has just paid for.
 *
 * Idempotent by way of property_payment_intent_id: Stripe retries webhooks, and
 * a second delivery must not bill the property twice. The charge helper also
 * carries an idempotency key on the booking id as a second line of defence.
 *
 * A failure here is logged, never thrown. The occupant has paid and the wash is
 * confirmed; failing the webhook would make Stripe retry the whole delivery and
 * risk re-running everything around it. An uncollected property share shows up
 * in error_logs with the booking id to chase.
 */
async function chargePropertyShareIfOwed(
  admin: ReturnType<typeof supabaseAdmin>,
  bookingId: string,
): Promise<void> {
  const { data: booking } = await admin
    .from('bookings')
    .select('id, building_id, operator_id, scheduled_for, property_charge_cents, property_payment_intent_id')
    .eq('id', bookingId)
    .maybeSingle();

  if (!booking) return;
  if ((booking.property_charge_cents ?? 0) <= 0) return;
  if (booking.property_payment_intent_id) return; // already settled

  const [{ data: operator }, { data: building }] = await Promise.all([
    admin.from('operators').select('stripe_account_id').eq('id', booking.operator_id).maybeSingle(),
    admin.from('buildings').select('name').eq('id', booking.building_id).maybeSingle(),
  ]);

  const billing = await getBuildingBilling(admin, booking.building_id);

  const charge = await chargePropertyForWash(admin, {
    bookingId: booking.id,
    buildingId: booking.building_id,
    amountCents: booking.property_charge_cents,
    customerId: billing.stripeCustomerId,
    paymentMethodId: billing.paymentMethodId,
    operatorStripeAccountId: operator?.stripe_account_id ?? null,
    description: `Car wash — ${building?.name ?? 'property'} · ${booking.scheduled_for}`,
  });

  if (!charge.ok) {
    void logError({
      source: 'webhooks.stripe.property-share',
      message: charge.error,
      context: { bookingId, amountCents: booking.property_charge_cents, needsAction: charge.needsAction },
    });
    return;
  }

  await admin
    .from('bookings')
    .update({ property_payment_intent_id: charge.paymentIntentId })
    .eq('id', booking.id);
}
