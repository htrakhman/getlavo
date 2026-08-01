import Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveSplit } from '@/lib/stripe/connect-split';
import { normalizeSize, priceForVehicle } from '@/lib/vehicle-sizes';
import {
  recurringAddonsForWash,
  recordWashAddonOrders,
  settleWashAddonOrders,
  unpaidWashAddons,
} from '@/lib/addons';

export type ChargeWashResult =
  | { ok: true; paymentIntentId: string; status: Stripe.PaymentIntent.Status }
  | { ok: false; status: number; error: string };

/**
 * Charge a resident for a completed wash and record the attempt in the
 * charges ledger. Every outcome — success, card failure, missing payment
 * method, prepaid by a booking — leaves a charges row so "resident X was
 * charged $Y for wash Z" (or wasn't, and why) is always answerable, and so
 * the resident, operator and admin pages all read the same source of truth
 * instead of inferring payment from a wash being marked done.
 */
export async function chargeWash(
  admin: SupabaseClient,
  washRecordId: string
): Promise<ChargeWashResult> {
  const { data: wash } = await admin
    .from('washes')
    .select(`
      id, wash_day_id,
      vehicle:vehicles(size),
      resident:residents(id, stripe_customer_id, stripe_payment_method_id, package:service_packages(id, price_cents, size_prices)),
      wash_day:wash_days(operator_id, operator:operators(stripe_account_id, stripe_onboarding_complete))
    `)
    .eq('id', washRecordId)
    .maybeSingle();

  if (!wash) return { ok: false, status: 404, error: 'not found' };

  const resident = wash.resident as any;
  const operator = (wash.wash_day as any)?.operator;
  const operatorId = (wash.wash_day as any)?.operator_id ?? null;

  // A package priced by vehicle type bills the tier for the car that was
  // actually washed. Without this the monthly plan charged the starting rate
  // for every vehicle, which is the same lapse the booking form had: the
  // operator set an SUV price and never got it.
  const vehicleSize = normalizeSize((wash as any).vehicle?.size);
  const packageCents: number | null = resident?.package
    ? priceForVehicle(resident.package, vehicleSize) || null
    : null;

  // Add-ons the resident asked for on every wash. Until now that choice was
  // stored and then ignored — never billed, never shown to the crew. Resolved
  // below, after the prepaid check: a wash a booking already paid for takes
  // its add-ons from that booking, not from the standing list.
  let addonCents = 0;
  let grossCents: number | null = packageCents;
  // Lavo's take, payment processing and the operator's share — the same
  // three-way split every resident payment uses (lib/stripe/connect-split.ts).
  let split = resolveSplit(grossCents ?? 0);

  /**
   * Write the ledger row for this wash. Called on every path — the row is the
   * record of what really happened, so a failure to charge is as important to
   * write as a success.
   */
  async function recordCharge(fields: Record<string, unknown>) {
    if (!resident?.id) return; // charges.resident_id is NOT NULL — nothing to key on
    const { error } = await admin.from('charges').upsert(
      {
        wash_id: washRecordId,
        resident_id: resident.id,
        operator_id: operatorId,
        wash_day_id: (wash as any).wash_day_id ?? null,
        package_id: resident.package?.id ?? null,
        amount_cents: grossCents ?? 0,
        fee_cents: split.takeCents,
        processing_fee_cents: split.processingCents,
        ...fields,
      },
      { onConflict: 'wash_id' }
    );
    if (error) console.error('chargeWash: charge record failed:', error.message);
  }

  // Never double-charge: the wash already has a successful (or in-flight) charge.
  const { data: existing } = await admin
    .from('charges')
    .select('id, status, stripe_payment_intent_id')
    .eq('wash_id', washRecordId)
    .maybeSingle();
  if (existing && ['succeeded', 'pending', 'refunded'].includes(existing.status) && existing.stripe_payment_intent_id) {
    return { ok: true, paymentIntentId: existing.stripe_payment_intent_id, status: 'succeeded' };
  }

  // A booking paid up front (the QR-funnel checkout) already covers this
  // resident on this wash day — booking confirmation is what put them on the
  // roster, so don't charge the package price on top of it.
  //
  // "Covers" means money actually moved: paid_at plus a payment intent, or a
  // fully discounted booking that was never meant to cost anything. A booking
  // row on its own proves nothing — status is set before checkout and can be
  // written by any code path — so anything short of that falls through to the
  // normal charge attempt rather than silently marking the wash paid.
  if (resident?.id && (wash as any).wash_day_id) {
    const { data: bookings } = await admin
      .from('bookings')
      .select('id, status, gross_cents, fee_cents, processing_fee_cents, paid_at, stripe_payment_intent_id')
      .eq('resident_id', resident.id)
      .eq('wash_day_id', (wash as any).wash_day_id)
      .neq('status', 'cancelled')
      .order('paid_at', { ascending: false, nullsFirst: false })
      .limit(5);

    const paidBooking = (bookings ?? []).find(
      (b: any) => b.paid_at && (b.stripe_payment_intent_id || (b.gross_cents ?? 0) <= 0)
    );

    if (paidBooking) {
      const bookingGross = paidBooking.gross_cents ?? 0;
      // Mirror what the booking actually charged, not a fresh calculation: the
      // money already moved on those terms, and a booking taken before
      // processing was passed through has none to mirror.
      const bookingSplit = resolveSplit(bookingGross, paidBooking.fee_cents);
      const bookingFee = paidBooking.fee_cents ?? bookingSplit.takeCents;
      const bookingProcessing = paidBooking.processing_fee_cents ?? bookingSplit.processingCents;
      // Mirror the prepayment into the ledger so the wash has a charge row like
      // every other completed wash — deduped against the booking by booking_id.
      const { error } = await admin.from('charges').upsert(
        {
          wash_id: washRecordId,
          resident_id: resident.id,
          operator_id: operatorId,
          wash_day_id: (wash as any).wash_day_id ?? null,
          package_id: resident.package?.id ?? null,
          booking_id: paidBooking.id,
          amount_cents: bookingGross,
          fee_cents: bookingFee,
          processing_fee_cents: bookingProcessing,
          status: 'succeeded',
          stripe_payment_intent_id: paidBooking.stripe_payment_intent_id ?? null,
          failure_reason: null,
        },
        { onConflict: 'wash_id' }
      );
      if (error) console.error('chargeWash: prepaid charge record failed:', error.message);

      if (paidBooking.status !== 'completed') {
        await admin
          .from('bookings')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', paidBooking.id);
      }

      return {
        ok: true,
        paymentIntentId: paidBooking.stripe_payment_intent_id ?? '',
        status: 'succeeded',
      };
    }
  }

  // Nothing prepaid this wash, so it's billed against the package. The add-on
  // rows are normally written when the roster is built; make sure they exist,
  // then bill exactly the unpaid ones — which is what the crew was told to do.
  if (resident?.id) {
    const recurringAddons = await recurringAddonsForWash(admin, resident.id, operatorId, vehicleSize);
    await recordWashAddonOrders(admin, { washId: washRecordId, residentId: resident.id, addons: recurringAddons });

    const billableAddons = await unpaidWashAddons(admin, washRecordId);
    addonCents = billableAddons.reduce((sum, a) => sum + (a.amount_cents ?? 0), 0);
    if (packageCents != null) {
      grossCents = packageCents + addonCents;
      split = resolveSplit(grossCents);
    }
  }

  if (!grossCents) {
    await recordCharge({ status: 'failed', failure_reason: 'no service package price on file' });
    return { ok: false, status: 400, error: 'no package price' };
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    await recordCharge({ status: 'failed', failure_reason: 'payments not configured' });
    return { ok: false, status: 503, error: 'stripe not configured' };
  }
  if (!resident?.stripe_customer_id || !resident?.stripe_payment_method_id) {
    await recordCharge({ status: 'failed', failure_reason: 'no payment method on file' });
    return { ok: false, status: 400, error: 'no payment method on file' };
  }
  if (!operator?.stripe_account_id || !operator?.stripe_onboarding_complete) {
    await recordCharge({ status: 'failed', failure_reason: 'operator not connected to Stripe' });
    return { ok: false, status: 400, error: 'operator not connected' };
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20.acacia' as any });

  try {
    const intent = await stripe.paymentIntents.create(
      {
        amount: grossCents,
        currency: 'usd',
        customer: resident.stripe_customer_id,
        payment_method: resident.stripe_payment_method_id,
        off_session: true,
        confirm: true,
        application_fee_amount: split.feeCents,
        transfer_data: { destination: operator.stripe_account_id },
        metadata: { wash_id: washRecordId },
      },
      // The amount is part of the key: a retry after the resident added an
      // add-on is a different charge, and Stripe rejects a reused key whose
      // params changed. Double-charging is prevented by the charges lookup
      // above, which returns before this point once a charge has landed.
      { idempotencyKey: `wash:${washRecordId}:${grossCents}` }
    );
    await recordCharge({
      status: intent.status === 'succeeded' ? 'succeeded' : 'pending',
      stripe_payment_intent_id: intent.id,
      failure_reason: null,
    });
    if (intent.status === 'succeeded') {
      await settleWashAddonOrders(admin, washRecordId, intent.id);
    }
    return { ok: true, paymentIntentId: intent.id, status: intent.status };
  } catch (e: any) {
    await recordCharge({ status: 'failed', failure_reason: e?.message ?? 'stripe error' });
    return { ok: false, status: 400, error: e?.message ?? 'stripe error' };
  }
}
