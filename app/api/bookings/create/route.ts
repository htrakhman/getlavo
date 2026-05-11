import { NextResponse } from 'next/server';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { calculateFee } from '@/lib/fee';
import { sendBookingConfirmation, sendBookingNotification } from '@/lib/email/resend';
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
});

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session || !session.portals.includes('resident')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = Body.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const { operatorId, vehicleId, scheduledFor, timeSlot, bookingType, partnershipId } = body.data;

  const sb = supabaseServer();
  const admin = supabaseAdmin();

  // Load resident and their building
  const { data: resident } = await sb
    .from('residents')
    .select('id, building_id, profile_id, building:buildings(name, lat, lng)')
    .eq('profile_id', session.user.id)
    .single();
  if (!resident) return NextResponse.json({ error: 'Resident record not found' }, { status: 404 });

  // Confirm the vehicle belongs to this resident
  const { data: vehicle } = await sb
    .from('vehicles')
    .select('id, make, model, color, license_plate')
    .eq('id', vehicleId)
    .eq('resident_id', resident.id)
    .single();
  if (!vehicle) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });

  // Load operator
  const { data: operator } = await admin
    .from('operators')
    .select('id, name, base_price_cents, open_slot_price_cents, stripe_account_id, stripe_onboarding_complete, capacity_per_day, owner_id, profiles:profiles!operators_owner_id_fkey(email, full_name)')
    .eq('id', operatorId)
    .eq('status', 'approved')
    .eq('stripe_onboarding_complete', true)
    .single();
  if (!operator) return NextResponse.json({ error: 'Operator not available' }, { status: 404 });

  // Determine price based on booking type
  const grossCents = bookingType === 'building_day'
    ? operator.base_price_cents
    : (operator.open_slot_price_cents ?? operator.base_price_cents);
  const { fee: feeCents, net: netCents } = calculateFee(grossCents);

  // Check capacity for this date
  const { count: existingBookings } = await admin
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('operator_id', operatorId)
    .eq('scheduled_for', scheduledFor)
    .in('status', ['confirmed', 'in_progress']);

  if ((existingBookings ?? 0) >= operator.capacity_per_day) {
    return NextResponse.json({ error: 'No capacity available on this date' }, { status: 409 });
  }

  // Create booking in pending_payment state
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
    })
    .select()
    .single();
  if (bookingError || !booking) {
    return NextResponse.json({ error: bookingError?.message ?? 'Failed to create booking' }, { status: 500 });
  }

  // Create Stripe Checkout session
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const building = resident.building as any;
  const vehicleDesc = `${vehicle.color} ${vehicle.make} ${vehicle.model}`;

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: 'usd',
        unit_amount: grossCents,
        product_data: {
          name: `Car wash — ${building.name}`,
          description: `${scheduledFor}${timeSlot ? ` at ${timeSlot}` : ''} · ${vehicleDesc}`,
        },
      },
      quantity: 1,
    }],
    payment_intent_data: operator.stripe_account_id ? {
      transfer_data: {
        destination: operator.stripe_account_id,
        amount: netCents,
      },
      metadata: { booking_id: booking.id },
    } : {
      metadata: { booking_id: booking.id },
    },
    metadata: { booking_id: booking.id },
    success_url: `${appUrl}/resident/bookings?booking=${booking.id}&success=1`,
    cancel_url: `${appUrl}/resident/book`,
  });

  // Store payment intent reference
  if (checkoutSession.payment_intent) {
    await admin
      .from('bookings')
      .update({ stripe_payment_intent_id: checkoutSession.payment_intent as string })
      .eq('id', booking.id);
  }

  return NextResponse.json({ checkoutUrl: checkoutSession.url });
}
