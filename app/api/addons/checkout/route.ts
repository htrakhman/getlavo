import { getSessionUser } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { destinationChargeParams, resolveSplit } from '@/lib/stripe/connect-split';
import { normalizeSize, priceForVehicle } from '@/lib/vehicle-sizes';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

/**
 * "Add to next wash only" — a one-off add-on bought outside a booking.
 *
 * This used to open a Stripe checkout and record nothing: the resident paid,
 * no addon_orders row existed, and the crew tool (which reads add-ons off the
 * wash) never showed the work (QA, July 2026). The order is now written before
 * the money moves, attached to the resident's next scheduled wash, and marked
 * paid by the webhook via addon_order_id.
 */
export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const addonId = url.searchParams.get('addon');
  if (!addonId) return NextResponse.json({ error: 'missing addon' }, { status: 400 });

  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Payments are not set up yet' }, { status: 503 });
  }

  const admin = supabaseAdmin();

  const { data: resident } = await admin
    .from('residents')
    .select('id, building_id')
    .eq('profile_id', session.user.id)
    .maybeSingle();
  if (!resident) return NextResponse.json({ error: 'resident not found' }, { status: 404 });

  const { data: addon } = await admin
    .from('operator_addons')
    .select('id, label, price_cents, size_prices, active, operator:operators(id, name, stripe_account_id)')
    .eq('id', addonId)
    .maybeSingle();
  if (!addon || !addon.active) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const operator = addon.operator as any;

  // Attach to the next upcoming wash this resident is rostered for, so the
  // crew sees the add-on on the day. Without one (no wash day scheduled yet)
  // the order still stands on its own and shows on the resident's add-ons.
  const today = new Date().toISOString().slice(0, 10);
  const { data: upcoming } = await admin
    .from('washes')
    .select('id, vehicle:vehicles(size), wash_day:wash_days!inner(scheduled_for, completed_at)')
    .eq('resident_id', resident.id)
    .is('completed_at', null)
    .gte('wash_days.scheduled_for', today)
    .limit(50);
  // PostgREST can't order parent rows by an embedded column, so pick the
  // soonest day here rather than trusting the query's order.
  const nextWash = (upcoming ?? [])
    .filter((w: any) => !w.wash_day?.completed_at)
    .sort((a: any, b: any) => String(a.wash_day?.scheduled_for).localeCompare(String(b.wash_day?.scheduled_for)))[0];

  // An add-on the operator prices by vehicle type costs what that resident's
  // car costs — the vehicle on the wash it's attaching to, or their primary one
  // when no wash is scheduled yet. Without this the one-off purchase charged the
  // starting rate whatever they drive.
  let vehicleSize = normalizeSize((nextWash as any)?.vehicle?.size);
  if (!vehicleSize) {
    const { data: primaryVehicle } = await admin
      .from('vehicles')
      .select('size')
      .eq('resident_id', resident.id)
      .order('is_primary', { ascending: false })
      .limit(1)
      .maybeSingle();
    vehicleSize = normalizeSize(primaryVehicle?.size);
  }
  const amountCents = priceForVehicle(addon, vehicleSize);
  if (!(amountCents > 0)) {
    return NextResponse.json({ error: 'That add-on isn’t priced yet' }, { status: 400 });
  }

  // A one-off add-on is a resident payment like any other: the operator's share
  // transfers automatically, and Lavo's take plus payment processing is
  // deducted the same way. This flow used to send the operator 100% and take
  // nothing, so add-on revenue was the one part of the marketplace the take
  // rate never touched.
  if (!operator?.stripe_account_id) {
    return NextResponse.json(
      { error: 'This operator can’t take payments right now — please try again later.' },
      { status: 409 },
    );
  }
  const split = resolveSplit(amountCents);

  const { data: order, error: orderError } = await admin
    .from('addon_orders')
    .insert({
      resident_id: resident.id,
      operator_addon_id: addon.id,
      amount_cents: amountCents,
      wash_id: nextWash?.id ?? null,
    })
    .select('id')
    .single();
  if (orderError || !order) {
    console.error('[addons/checkout] failed to record add-on order', {
      addonId,
      residentId: resident.id,
      message: orderError?.message,
    });
    return NextResponse.json(
      { error: 'We couldn’t start that add-on. Your card was not charged — please try again.' },
      { status: 500 },
    );
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

  let checkout: Stripe.Checkout.Session;
  try {
    checkout = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: `${addon.label} — ${operator?.name ?? 'add-on'}` },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        ...destinationChargeParams(split, operator.stripe_account_id),
        metadata: { addon_order_id: order.id },
      },
      success_url: `${url.origin}/resident?addon=success`,
      cancel_url: `${url.origin}/resident/addons`,
      metadata: { addon_order_id: order.id, addon_id: addonId, user_id: session.user.id },
    });
  } catch (e: any) {
    // Don't leave an unpaid order behind that nobody will ever settle.
    await admin.from('addon_orders').delete().eq('id', order.id);
    console.error('[addons/checkout] stripe checkout failed', { addonId, message: e?.message });
    return NextResponse.json(
      { error: 'We couldn’t start checkout. Your card was not charged — please try again.' },
      { status: 502 },
    );
  }

  if (!checkout.url) {
    await admin.from('addon_orders').delete().eq('id', order.id);
    return NextResponse.json({ error: 'We couldn’t start checkout. Please try again.' }, { status: 502 });
  }

  return NextResponse.redirect(checkout.url, { status: 303 });
}

export const GET = POST;
