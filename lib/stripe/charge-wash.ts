import Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';
import { calculateFee } from '@/lib/fee';

export type ChargeWashResult =
  | { ok: true; paymentIntentId: string; status: Stripe.PaymentIntent.Status }
  | { ok: false; status: number; error: string };

/**
 * Charge a resident for a completed wash and record the attempt in the
 * charges ledger. Every outcome — success, card failure, missing payment
 * method — leaves a charges row so "resident X was charged $Y for wash Z"
 * (or wasn't, and why) is always answerable.
 */
export async function chargeWash(
  admin: SupabaseClient,
  washRecordId: string
): Promise<ChargeWashResult> {
  if (!process.env.STRIPE_SECRET_KEY) {
    return { ok: false, status: 503, error: 'stripe not configured' };
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20.acacia' as any });

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
  const grossCents = resident?.package?.price_cents;
  const { fee } = calculateFee(grossCents ?? 0);

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
  // roster. Their payment record lives in bookings, so skip the package charge.
  if (resident?.id && (wash as any).wash_day_id) {
    const { data: paidBooking } = await admin
      .from('bookings')
      .select('id, stripe_payment_intent_id')
      .eq('resident_id', resident.id)
      .eq('wash_day_id', (wash as any).wash_day_id)
      .in('status', ['confirmed', 'in_progress', 'completed'])
      .limit(1)
      .maybeSingle();
    if (paidBooking) {
      return { ok: true, paymentIntentId: paidBooking.stripe_payment_intent_id ?? '', status: 'succeeded' };
    }
  }

  async function recordCharge(fields: Record<string, unknown>) {
    if (!resident?.id || !grossCents) return; // nothing chargeable to record
    const { error } = await admin.from('charges').upsert(
      {
        wash_id: washRecordId,
        resident_id: resident.id,
        operator_id: operatorId,
        wash_day_id: (wash as any).wash_day_id ?? null,
        package_id: resident.package?.id ?? null,
        amount_cents: grossCents,
        fee_cents: fee,
        ...fields,
      },
      { onConflict: 'wash_id' }
    );
    if (error) console.error('chargeWash: charge record failed:', error.message);
  }

  if (!grossCents) return { ok: false, status: 400, error: 'no package price' };
  if (!resident?.stripe_customer_id || !resident?.stripe_payment_method_id) {
    await recordCharge({ status: 'failed', failure_reason: 'no payment method on file' });
    return { ok: false, status: 400, error: 'no payment method on file' };
  }
  if (!operator?.stripe_account_id || !operator?.stripe_onboarding_complete) {
    await recordCharge({ status: 'failed', failure_reason: 'operator not connected to Stripe' });
    return { ok: false, status: 400, error: 'operator not connected' };
  }

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
      { idempotencyKey: `wash:${washRecordId}` }
    );
    await recordCharge({
      status: intent.status === 'succeeded' ? 'succeeded' : 'pending',
      stripe_payment_intent_id: intent.id,
      failure_reason: null,
    });
    return { ok: true, paymentIntentId: intent.id, status: intent.status };
  } catch (e: any) {
    await recordCharge({ status: 'failed', failure_reason: e?.message ?? 'stripe error' });
    return { ok: false, status: 400, error: e?.message ?? 'stripe error' };
  }
}
