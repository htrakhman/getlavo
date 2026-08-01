import { NextResponse } from 'next/server';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { calculateFee } from '@/lib/fee';
import { applyPromoToBooking, recordPromoRedemption } from '@/lib/promo';
import { confirmPaidBookingAndNotify } from '@/lib/booking-confirm';
import { priceAddonSelection, recordBookingAddonOrders, releaseBookingAddonOrders } from '@/lib/addons';
import { syncWashDayRoster } from '@/lib/wash-roster';
import { WAIVER_VERSION } from '@/lib/waiver';
import { standardWashPricing, washCentsFor } from '@/lib/wash-pricing';
import { normalizeSize, priceForVehicle } from '@/lib/vehicle-sizes';
import Stripe from 'stripe';
import { z } from 'zod';

const Body = z.object({
  operatorId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  scheduledFor: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeSlot: z.string().optional(),
  bookingType: z.enum(['building_day', 'open_slot']).default('open_slot'),
  packageId: z.string().uuid().optional(),
  partnershipId: z.string().uuid().optional(),
  recurringCadence: z.enum(['weekly', 'biweekly', 'monthly']).optional(),
  addonIds: z.array(z.string().uuid()).max(10).optional(),
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
  const { operatorId, vehicleId, scheduledFor, timeSlot, bookingType, packageId, partnershipId, recurringCadence, addonIds, promoCode, waiverAccepted } =
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
    .select('id, make, model, color, license_plate, size')
    .eq('id', vehicleId)
    .eq('resident_id', resident.id)
    .single();
  if (!vehicle) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });

  // The vehicle's tier decides the price of everything below when the operator
  // prices by vehicle type. Vehicles added before that field existed have none;
  // the booking form asks for it before checkout, so reaching here without one
  // means a stale tab. Better to send them back for one tap than to charge the
  // sedan rate for a pickup.
  const vehicleSize = normalizeSize(vehicle.size);
  if (!vehicleSize) {
    return NextResponse.json(
      { error: 'Please choose your vehicle type before booking — it sets the price for your wash.' },
      { status: 400 },
    );
  }

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

  // A selected wash package (Basic/Premium/etc.) overrides the flat
  // building-day/on-demand price. Re-read from the operator's live catalogue —
  // the client is never trusted for price, and a stale or foreign id is
  // rejected rather than silently falling back to the flat price.
  //
  // A package the operator prices by vehicle type rings up at the tier for this
  // resident's vehicle, not at the starting rate — same resolution the form
  // quoted (lib/vehicle-sizes).
  let packageRow: { id: string; name: string; price_cents: number } | null = null;
  if (packageId) {
    const { data: pkg, error: pkgError } = await admin
      .from('service_packages')
      .select('id, name, price_cents, size_prices')
      .eq('id', packageId)
      .eq('operator_id', operatorId)
      .eq('active', true)
      .maybeSingle();
    if (pkgError || !pkg) {
      return NextResponse.json({ error: 'That wash package is no longer available' }, { status: 400 });
    }
    const packageCents = priceForVehicle(pkg, vehicleSize);
    // An unpriced package isn't listed on the form, and isn't free work either.
    if (!(packageCents > 0)) {
      return NextResponse.json({ error: 'That wash package isn’t priced yet' }, { status: 400 });
    }
    packageRow = { id: pkg.id, name: pkg.name, price_cents: packageCents };
  }

  // No package selected means the standard wash: the rate the operator set for
  // their regular wash, or the one this building's agreement fixed — the same
  // resolution the booking form quoted (see lib/wash-pricing.ts).
  const washPricing = await standardWashPricing(admin, {
    buildingId: resident.building_id,
    operatorId,
    operator,
  });

  // An operator with no standard wash rate has no standard wash to sell. The
  // form hides the option; a stale tab could still post it, and charging $0
  // would be worse than saying no.
  if (!packageRow && !washPricing.available) {
    return NextResponse.json(
      { error: 'This operator hasn’t priced their standard wash yet — please choose a package.' },
      { status: 400 },
    );
  }

  const baseGrossCents = packageRow ? packageRow.price_cents : washCentsFor(washPricing, bookingType);

  const promoResult = await applyPromoToBooking(admin, {
    rawCode: promoCode,
    profileId: session.user.id,
    residentId: resident.id,
    baseGrossCents,
  });
  if (!promoResult.ok) {
    return NextResponse.json({ error: promoResult.error }, { status: 400 });
  }

  // Add-ons are priced from the operator's live catalogue, never from the
  // client, and sit outside the promo: "free first wash" covers the wash.
  const addonResult = await priceAddonSelection(admin, operatorId, addonIds, vehicleSize);
  if (!addonResult.ok) {
    return NextResponse.json({ error: addonResult.error }, { status: 400 });
  }
  const { addons, totalCents: addonTotalCents } = addonResult;

  const grossCents = promoResult.finalGrossCents + addonTotalCents;
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
      package_id: packageRow?.id ?? null,
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

  // Record the add-ons before taking any money. If they can't be recorded the
  // crew would never be told to do the work, so cancel rather than charge for
  // a service nobody would perform.
  if (!(await recordBookingAddonOrders(admin, { bookingId: booking.id, residentId: resident.id, addons }))) {
    await admin.from('bookings').update({ status: 'cancelled' }).eq('id', booking.id);
    return NextResponse.json(
      { error: 'We couldn’t add those extras right now. Your card was not charged — please try again.' },
      { status: 500 },
    );
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
    await releaseBookingAddonOrders(admin, bookingId);
    const { error } = await admin.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId);
    if (error) {
      console.error('[bookings/create] failed to release unpaid booking', {
        bookingId,
        message: error.message,
      });
    }
  }

  // The wash and each add-on are separate line items so the resident sees the
  // same breakdown on Stripe that they ticked on the booking form. A promo
  // that zeroes the wash drops its line rather than sending Stripe a $0 item.
  const taxBehavior = process.env.STRIPE_TAX_ENABLED === '1' ? { tax_behavior: 'exclusive' as const } : {};
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  if (promoResult.finalGrossCents > 0) {
    lineItems.push({
      price_data: {
        currency: 'usd',
        unit_amount: promoResult.finalGrossCents,
        ...taxBehavior,
        product_data: {
          name: packageRow ? `${packageRow.name} — ${buildingName}` : `Car wash — ${buildingName}`,
          description: `${scheduledFor}${timeSlot ? ` at ${timeSlot}` : ''} · ${vehicleDesc}`,
        },
      },
      quantity: 1,
    });
  }
  for (const a of addons) {
    lineItems.push({
      price_data: {
        currency: 'usd',
        unit_amount: a.price_cents,
        ...taxBehavior,
        product_data: {
          name: `${a.label} — add-on`,
          description: `${scheduledFor}${timeSlot ? ` at ${timeSlot}` : ''} · ${vehicleDesc}`,
        },
      },
      quantity: 1,
    });
  }

  let checkoutSession: Stripe.Checkout.Session;
  try {
    checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      ...(process.env.STRIPE_TAX_ENABLED === '1' ? { automatic_tax: { enabled: true } } : {}),
      line_items: lineItems,
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
