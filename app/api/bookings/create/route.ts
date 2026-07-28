import { NextResponse } from 'next/server';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { calculateFee } from '@/lib/fee';
import { applyPromoToBooking, recordPromoRedemption } from '@/lib/promo';
import { confirmPaidBookingAndNotify } from '@/lib/booking-confirm';
import { syncWashDayRoster } from '@/lib/wash-roster';
import { WAIVER_VERSION } from '@/lib/waiver';
import Stripe from 'stripe';
import { z } from 'zod';

const Body = z.object({
  operatorId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  scheduledFor: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeSlot: z.string().optional(),
  bookingType: z.enum(['building_day', 'open_slot']).default('open_slot'),
  partnershipId: z.string().uuid().optional(),
  recurringCadence: z.enum(['weekly', 'biweekly', 'monthly']).optional(),
  promoCode: z.string().optional(),
  waiverAccepted: z.boolean().optional(),
});

/**
 * Stripe rejects a Connect destination when the account does not exist under
 * the current key (mode switch) or cannot receive transfers yet. Those are
 * operator-onboarding problems, not resident problems, so we recognize them to
 * reconcile the stored "onboarding complete" flag instead of leaving the
 * operator bookable and failing every resident who tries.
 */
function isConnectAccountError(err: any): boolean {
  const code: string = err?.code ?? '';
  const param: string = err?.param ?? '';
  const message: string = err?.message ?? '';
  if (code === 'account_invalid' || code === 'account_country_invalid_address') return true;
  if (code === 'resource_missing' && /destination|account/i.test(`${param} ${message}`)) return true;
  return /capabilit|not have access to|transfers|destination account/i.test(message);
}

export async function POST(req: Request) {
  try {
    return await createBooking(req);
  } catch (e: any) {
    // Anything unanticipated still has to reach the client as JSON: an empty
    // 500 body makes the caller's res.json() throw, which is what left the
    // booking page stuck on "Redirecting to payment…" with no way back.
    console.error('[bookings/create] unhandled failure', {
      message: e?.message,
      type: e?.type,
      code: e?.code,
      stack: e?.stack,
    });
    return NextResponse.json(
      { error: 'Something went wrong creating your booking. Please try again.' },
      { status: 500 },
    );
  }
}

async function createBooking(req: Request) {
  const session = await getSessionUser();
  if (!session || !session.portals.includes('resident')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    // Fail before the insert so a misconfigured deploy doesn't leave orphaned
    // pending_payment rows behind.
    console.error('[bookings/create] STRIPE_SECRET_KEY is not configured');
    return NextResponse.json(
      { error: 'Payments are not set up yet. Please try again shortly.' },
      { status: 503 },
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const body = Body.safeParse(raw);
  if (!body.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const { operatorId, vehicleId, scheduledFor, timeSlot, bookingType, partnershipId, recurringCadence, promoCode, waiverAccepted } =
    body.data;

  const admin = supabaseAdmin();
  const sb = supabaseServer();

  const { data: resident } = await admin
    .from('residents')
    .select('id, building_id, profile_id, building:buildings(name, lat, lng)')
    .eq('profile_id', session.user.id)
    .single();
  if (!resident) return NextResponse.json({ error: 'Resident record not found' }, { status: 404 });

  // One time service acknowledgment: an independent operator does the work,
  // Lavo and the building are not liable for vehicle damage, and the
  // operator may enter the garage or lot. Recorded once per waiver version
  // so it stays provable.
  const { data: waiver } = await admin
    .from('waiver_acceptances')
    .select('id')
    .eq('profile_id', session.user.id)
    .eq('waiver_version', WAIVER_VERSION)
    .maybeSingle();
  if (!waiver) {
    if (!waiverAccepted) {
      return NextResponse.json({ error: 'Please accept the service acknowledgment to book.' }, { status: 400 });
    }
    const { error: waiverError } = await admin.from('waiver_acceptances').insert({
      profile_id: session.user.id,
      resident_id: resident.id,
      waiver_version: WAIVER_VERSION,
    });
    if (waiverError && waiverError.code !== '23505') {
      return NextResponse.json({ error: 'Could not record your acknowledgment. Please try again.' }, { status: 500 });
    }
  }

  const { data: vehicle } = await admin
    .from('vehicles')
    .select('id, make, model, color, license_plate')
    .eq('id', vehicleId)
    .eq('resident_id', resident.id)
    .single();
  if (!vehicle) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });

  const { data: operator, error: operatorError } = await sb
    .from('operators')
    .select(
      'id, name, base_price_cents, open_slot_price_cents, stripe_account_id, stripe_onboarding_complete, capacity_per_day, owner_id, live_ok',
    )
    .eq('id', operatorId)
    .eq('status', 'approved')
    .eq('stripe_onboarding_complete', true)
    .single();
  if (operatorError || !operator) {
    console.error('[bookings/create] operator lookup failed', { operatorId, operatorError });
    return NextResponse.json({ error: 'Operator not available' }, { status: 404 });
  }
  if (operator.live_ok === false) {
    return NextResponse.json({ error: 'This operator is not accepting new bookings yet' }, { status: 403 });
  }

  const baseGrossCents =
    bookingType === 'building_day'
      ? operator.base_price_cents
      : (operator.open_slot_price_cents ?? operator.base_price_cents);

  const promoResult = await applyPromoToBooking(admin, {
    rawCode: promoCode,
    profileId: session.user.id,
    residentId: resident.id,
    baseGrossCents,
  });
  if (!promoResult.ok) {
    return NextResponse.json({ error: promoResult.error }, { status: 400 });
  }

  const grossCents = promoResult.finalGrossCents;
  const promoDiscountCents = promoResult.discountCents;
  const promoRow = promoResult.promo;
  const { fee: feeCents, net: netCents } = calculateFee(grossCents);

  const { count: existingBookings } = await admin
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('operator_id', operatorId)
    .eq('scheduled_for', scheduledFor)
    .in('status', ['confirmed', 'in_progress']);

  if ((existingBookings ?? 0) >= operator.capacity_per_day) {
    return NextResponse.json({ error: 'No capacity available on this date' }, { status: 409 });
  }

  // Building-day bookings belong to the building's wash day: link the row so
  // the crew roster and prep views can count this resident. Availability can
  // offer manager-set weekly days that have no wash_days row yet, so
  // materialize one against the active partnership when needed.
  let washDayId: string | null = null;
  if (bookingType === 'building_day' && resident.building_id) {
    const { data: existingDay } = await admin
      .from('wash_days')
      .select('id')
      .eq('building_id', resident.building_id)
      .eq('scheduled_for', scheduledFor)
      .neq('confirmation', 'declined')
      .limit(1)
      .maybeSingle();
    washDayId = existingDay?.id ?? null;

    if (!washDayId) {
      const { data: partnership } = await admin
        .from('partnerships')
        .select('id')
        .eq('building_id', resident.building_id)
        .eq('operator_id', operatorId)
        .eq('status', 'active')
        .maybeSingle();
      if (partnership) {
        const { data: newDay, error: dayError } = await admin
          .from('wash_days')
          .insert({
            building_id: resident.building_id,
            operator_id: operatorId,
            partnership_id: partnership.id,
            scheduled_for: scheduledFor,
            confirmation: 'auto',
          })
          .select('id')
          .single();
        if (dayError || !newDay) {
          console.error('[bookings/create] failed to create wash day', {
            buildingId: resident.building_id,
            scheduledFor,
            message: dayError?.message,
          });
        } else {
          washDayId = newDay.id;
          // Packaged residents join every new wash day, same as the propose flow.
          await syncWashDayRoster(admin, newDay.id);
        }
      }
    }
  }

  const { data: booking, error: bookingError } = await admin
    .from('bookings')
    .insert({
      resident_id: resident.id,
      operator_id: operatorId,
      building_id: resident.building_id,
      vehicle_id: vehicleId,
      partnership_id: partnershipId ?? null,
      wash_day_id: washDayId,
      booking_type: bookingType,
      scheduled_for: scheduledFor,
      time_slot: timeSlot ?? null,
      status: 'pending_payment',
      gross_cents: grossCents,
      fee_cents: feeCents,
      net_cents: netCents,
      recurring_cadence: recurringCadence ?? null,
      promo_code_id: promoRow?.id ?? null,
      promo_discount_cents: promoDiscountCents,
    })
    .select()
    .single();
  if (bookingError || !booking) {
    return NextResponse.json({ error: bookingError?.message ?? 'Failed to create booking' }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const building = resident.building as any;
  const buildingName = building?.name ?? operator.name ?? 'your building';
  const vehicleDesc = `${vehicle.color} ${vehicle.make} ${vehicle.model}`;

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });

  if (grossCents <= 0) {
    await confirmPaidBookingAndNotify(admin, booking.id, null);
    if (promoRow) {
      await recordPromoRedemption(admin, {
        promoId: promoRow.id,
        profileId: session.user.id,
        bookingId: booking.id,
      });
    }
    return NextResponse.json({ checkoutUrl: null, freeBooking: true, bookingId: booking.id });
  }

  // The booking row already exists at this point. If checkout can't be
  // created, release it rather than leaving a pending_payment row the resident
  // can never pay for — a retry then starts clean instead of stacking rows.
  async function releaseBooking(bookingId: string) {
    const { error } = await admin.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId);
    if (error) {
      console.error('[bookings/create] failed to release unpaid booking', {
        bookingId,
        message: error.message,
      });
    }
  }

  let checkoutSession: Stripe.Checkout.Session;
  try {
    checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      ...(process.env.STRIPE_TAX_ENABLED === '1' ? { automatic_tax: { enabled: true } } : {}),
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: grossCents,
            ...(process.env.STRIPE_TAX_ENABLED === '1' ? { tax_behavior: 'exclusive' as const } : {}),
            product_data: {
              name: `Car wash — ${buildingName}`,
              description: `${scheduledFor}${timeSlot ? ` at ${timeSlot}` : ''} · ${vehicleDesc}`,
            },
          },
          quantity: 1,
        },
      ],
      payment_intent_data: operator.stripe_account_id
        ? {
            transfer_data: {
              destination: operator.stripe_account_id,
              amount: netCents,
            },
            metadata: { booking_id: booking.id },
          }
        : {
            metadata: { booking_id: booking.id },
          },
      metadata: {
        booking_id: booking.id,
        ...(promoRow ? { promo_code_id: promoRow.id } : {}),
      },
      success_url: `${appUrl}/resident/bookings?booking=${booking.id}&success=1`,
      cancel_url: `${appUrl}/resident/book`,
    });
  } catch (e: any) {
    // Log the real Stripe reason — without this the failure surfaced only as a
    // bare 500 and the actual cause was invisible in the logs.
    console.error('[bookings/create] stripe checkout session failed', {
      bookingId: booking.id,
      operatorId,
      stripeAccountId: operator.stripe_account_id,
      grossCents,
      netCents,
      type: e?.type,
      code: e?.code,
      param: e?.param,
      message: e?.message,
    });
    await releaseBooking(booking.id);

    if (operator.stripe_account_id && isConnectAccountError(e)) {
      // Keep the stored flag honest with Stripe (same reconciliation the
      // operator's connect/status check does) so this operator stops being
      // offered for booking until they finish onboarding.
      const { error: flagError } = await admin
        .from('operators')
        .update({ stripe_onboarding_complete: false })
        .eq('id', operatorId);
      if (flagError) {
        console.error('[bookings/create] failed to reset operator onboarding flag', {
          operatorId,
          message: flagError.message,
        });
      }
      return NextResponse.json(
        { error: 'This operator can’t take payments right now. Please try another operator or check back soon.' },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: 'We couldn’t start checkout. Your card was not charged — please try again.' },
      { status: 502 },
    );
  }

  if (!checkoutSession.url) {
    console.error('[bookings/create] stripe returned a session with no url', {
      bookingId: booking.id,
      sessionId: checkoutSession.id,
    });
    await releaseBooking(booking.id);
    return NextResponse.json(
      { error: 'We couldn’t start checkout. Your card was not charged — please try again.' },
      { status: 502 },
    );
  }

  // Checkout on this API version doesn't create a PaymentIntent until the
  // customer confirms, so the session id is the only reliable link back to
  // the payment (used by the redirect-time verification fallback).
  const { error: linkError } = await admin
    .from('bookings')
    .update({
      stripe_checkout_session_id: checkoutSession.id,
      ...(checkoutSession.payment_intent
        ? { stripe_payment_intent_id: checkoutSession.payment_intent as string }
        : {}),
    })
    .eq('id', booking.id);
  if (linkError) {
    console.error('[bookings/create] failed to store checkout session id', {
      bookingId: booking.id,
      message: linkError.message,
    });
  }

  return NextResponse.json({ checkoutUrl: checkoutSession.url });
}
