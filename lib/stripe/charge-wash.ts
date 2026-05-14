import Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';
import { calculateFee } from '@/lib/fee';

export type ChargeWashResult =
  | { ok: true; paymentIntentId: string; status: Stripe.PaymentIntent.Status }
  | { ok: false; status: number; error: string };

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
      id,
      resident:residents(id, stripe_customer_id, stripe_payment_method_id, package:service_packages(price_cents)),
      wash_day:wash_days(operator:operators(stripe_account_id, stripe_onboarding_complete))
    `)
    .eq('id', washRecordId)
    .maybeSingle();

  if (!wash) return { ok: false, status: 404, error: 'not found' };

  const resident = wash.resident as any;
  const operator = (wash.wash_day as any)?.operator;

  if (!resident?.stripe_customer_id || !resident?.stripe_payment_method_id) {
    return { ok: false, status: 400, error: 'no payment method on file' };
  }
  if (!operator?.stripe_account_id || !operator?.stripe_onboarding_complete) {
    return { ok: false, status: 400, error: 'operator not connected' };
  }
  const grossCents = resident.package?.price_cents;
  if (!grossCents) return { ok: false, status: 400, error: 'no package price' };

  const { fee } = calculateFee(grossCents);

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
    return { ok: true, paymentIntentId: intent.id, status: intent.status };
  } catch (e: any) {
    return { ok: false, status: 400, error: e?.message ?? 'stripe error' };
  }
}
