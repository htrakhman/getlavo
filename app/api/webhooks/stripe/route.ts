import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendBookingConfirmation, sendBookingNotification } from '@/lib/email/resend';
import { notify } from '@/lib/notify';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2024-06-20' });
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? '';

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature') ?? '';

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const admin = supabaseAdmin();

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId = session.metadata?.booking_id;
    if (!bookingId) return NextResponse.json({ ok: true });

    // Confirm booking
    await admin
      .from('bookings')
      .update({
        status: 'confirmed',
        paid_at: new Date().toISOString(),
        stripe_payment_intent_id: typeof session.payment_intent === 'string'
          ? session.payment_intent
          : (session.payment_intent as any)?.id ?? null,
      })
      .eq('id', bookingId);

    // Load booking details for emails
    const { data: booking } = await admin
      .from('bookings')
      .select(`
        id, scheduled_for, time_slot, gross_cents,
        resident:residents(profile:profiles(email, full_name)),
        operator:operators(name, owner_id, profiles:profiles!operators_owner_id_fkey(email, full_name)),
        building:buildings(name),
        vehicle:vehicles(make, model, color)
      `)
      .eq('id', bookingId)
      .single();

    if (booking) {
      const resident = (booking.resident as any)?.profile;
      const operator = booking.operator as any;
      const building = booking.building as any;
      const vehicle = booking.vehicle as any;
      const ownerProfile = operator?.profiles;

      // Email resident confirmation
      if (resident?.email) {
        await sendBookingConfirmation({
          to: resident.email,
          residentName: resident.full_name,
          operatorName: operator?.name ?? '',
          buildingName: building?.name ?? '',
          scheduledFor: booking.scheduled_for,
          timeSlot: booking.time_slot,
          grossCents: booking.gross_cents,
          bookingId,
        }).catch(() => {});
      }

      // Email operator notification
      if (ownerProfile?.email) {
        const { data: fullBooking } = await admin
          .from('bookings')
          .select('net_cents')
          .eq('id', bookingId)
          .single();

        await sendBookingNotification({
          to: ownerProfile.email,
          operatorName: ownerProfile.full_name ?? operator.name,
          buildingName: building?.name ?? '',
          residentName: resident?.full_name ?? '',
          vehicleDescription: vehicle ? `${vehicle.color} ${vehicle.make} ${vehicle.model}` : '',
          scheduledFor: booking.scheduled_for,
          timeSlot: booking.time_slot,
          netCents: fullBooking?.net_cents ?? 0,
        }).catch(() => {});
      }
    }
  }

  // Handle addon order payments (from /api/addons/checkout)
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const addonOrderId = session.metadata?.addon_order_id;
    if (addonOrderId) {
      await admin
        .from('addon_orders')
        .update({
          paid_at: new Date().toISOString(),
          stripe_payment_intent_id: typeof session.payment_intent === 'string'
            ? session.payment_intent
            : null,
        })
        .eq('id', addonOrderId);
    }
  }

  // ----- Stripe Connect: keep operator.stripe_onboarding_complete in sync -----
  if (event.type === 'account.updated') {
    const account = event.data.object as Stripe.Account;
    const complete = !!account.charges_enabled && !!account.payouts_enabled;
    await admin.from('operators').update({ stripe_onboarding_complete: complete }).eq('stripe_account_id', account.id);
  }

  // ----- Recurring per-wash charge succeeded -----
  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as Stripe.PaymentIntent;
    const washId = pi.metadata?.wash_id;
    if (washId) {
      // No-op for the wash itself (already marked completed when the operator hit DONE).
      // Just record the payment intent on a booking row if one is linked.
      await admin.from('bookings').update({
        status: 'completed',
        paid_at: new Date().toISOString(),
        stripe_payment_intent_id: pi.id,
      }).eq('stripe_payment_intent_id', pi.id);
    }
  }

  // ----- Charge failed → notify resident -----
  if (event.type === 'payment_intent.payment_failed') {
    const pi = event.data.object as Stripe.PaymentIntent;
    const washId = pi.metadata?.wash_id;
    if (washId) {
      const { data: wash } = await admin
        .from('washes')
        .select('resident:residents(profile_id)')
        .eq('id', washId)
        .maybeSingle();
      const profileId = (wash?.resident as any)?.profile_id;
      if (profileId) {
        await notify(profileId, 'payment_failed', {});
      }
    }
  }

  return NextResponse.json({ ok: true });
}
