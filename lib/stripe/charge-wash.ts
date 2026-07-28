import Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';
import { calculateFee } from '@/lib/fee';
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
      resident:residents(id, stripe_customer_id, stripe_payment_method_id, package:service_packages(id, price_cents)),
      wash_day:wash_days(operator_id, operator:operators(stripe_account_id, stripe_onboarding_complete))
    `)
    .eq('id', washRecordId)
    .maybeSingle();

  if (!wash) return { ok: false, status: 404, error: 'not found' };

  const resident = wash.resident as any;
  const operator = (wash.wash_day as any)?.operator;
  const operatorId = (wash.wash_day as any)?.operator_id ?? null;
  const packageCents: number | null = resident?.package?.price_cents ?? null;

  // Add-ons the resident asked for on every wash. Until now that choice was
  // stored and then ignored — never billed, never shown to the crew. Resolved
  // below, after the prepaid check: a wash a booking already paid for takes
  // its add-ons from that booking, not from the standing list.
  let addonCents = 0;
  let grossCents: number | null = packageCents;
  let fee = calculateFee(grossCents ?? 0).fee;

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
        fee_cents: fee,
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
      .select('id, status, gross_cents, fee_cents, paid_at, stripe_payment_intent_id')
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
      const bookingFee = paidBooking.fee_cents ?? calculateFee(bookingGross).fee;
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
    const recurringAddons = await recurringAddonsForWash(admin, resident.id, operatorId);
    await recordWashAddonOrders(admin, { washId: washRecordId, residentId: resident.id, addons: recurringAddons });

    const billableAddons = await unpaidWashAddons(admin, washRecordId);
    addonCents = billableAddons.reduce((sum, a) => sum + (a.amount_cents ?? 0), 0);
    if (packageCents != null) {
      grossCents = packageCents + addonCents;
      fee = calculateFee(grossCents).fee;
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
        application_fee_amount: fee,
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
