import { NextResponse } from 'next/server';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { calculateFee } from '@/lib/fee';
import { applyPromoToBooking, recordPromoRedemption } from '@/lib/promo';
import { confirmPaidBookingAndNotify } from '@/lib/booking-confirm';
import Stripe from 'stripe';
import { z } from 'zod';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2024-06-20' });

const Body = z.object({
  operatorId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  scheduledFor: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeSlot: z.string().optional(),
  bookingType: z.enum(['building_day', 'open_slot']).default('open_slot'),
  partnershipId: z.string().uuid().optional(),
  recurringCadence: z.enum(['weekly', 'biweekly', 'monthly']).optional(),
  promoCode: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session || !session.portals.includes('resident')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = Body.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const { operatorId, vehicleId, scheduledFor, timeSlot, bookingType, partnershipId, recurringCadence, promoCode } =
    body.data;

  const sb = supabaseServer();
  const admin = supabaseAdmin();

  const { data: resident } = await sb
    .from('residents')
    .select('id, building_id, profile_id, building:buildings(name, lat, lng)')
    .eq('profile_id', session.user.id)
    .single();
  if (!resident) return NextResponse.json({ error: 'Resident record not found' }, { status: 404 });

  const { data: vehicle } = await sb
    .from('vehicles')
    .select('id, make, model, color, license_plate')
    .eq('id', vehicleId)
    .eq('resident_id', resident.id)
    .single();
  if (!vehicle) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });

  const { data: operator } = await admin
    .from('operators')
    .select(
      'id, name, base_price_cents, open_slot_price_cents, stripe_account_id, stripe_onboarding_complete, capacity_per_day, owner_id, live_ok, profiles:profiles!operators_owner_id_fkey(email, full_name)',
    )
    .eq('id', operatorId)
    .eq('status', 'approved')
    .eq('stripe_onboarding_complete', true)
    .single();
  if (!operator) return NextResponse.json({ error: 'Operator not available' }, { status: 404 });
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

  const { data: booking, error: bookingError } = await admin
    .from('bookings')
    .insert({
      resident_id: resident.id,
      operator_id: operatorId,
      building_id: resident.building_id,
      vehicle_id: vehicleId,
      partnership_id: partnershipId ?? null,
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
  const vehicleDesc = `${vehicle.color} ${vehicle.make} ${vehicle.model}`;

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

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'payment',
    ...(process.env.STRIPE_TAX_ENABLED === '1' ? { automatic_tax: { enabled: true } } : {}),
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: grossCents,
          product_data: {
            name: `Car wash — ${building.name}`,
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

  if (checkoutSession.payment_intent) {
    await admin
      .from('bookings')
      .update({ stripe_payment_intent_id: checkoutSession.payment_intent as string })
      .eq('id', booking.id);
  }

  return NextResponse.json({ checkoutUrl: checkoutSession.url });
}
