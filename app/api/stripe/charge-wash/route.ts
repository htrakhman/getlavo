import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { calculateFee } from '@/lib/fee';

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'stripe not configured' }, { status: 503 });
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20.acacia' as any });
  const sb = supabaseAdmin();

  const { washRecordId } = await req.json();

  const { data: wash } = await sb
    .from('washes')
    .select(`
      id,
      resident:residents(id, stripe_customer_id, stripe_payment_method_id, package:service_packages(price_cents)),
      wash_day:wash_days(operator:operators(stripe_account_id, stripe_onboarding_complete))
    `)
    .eq('id', washRecordId)
    .maybeSingle();

  if (!wash) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const resident = wash.resident as any;
  const operator = (wash.wash_day as any)?.operator;

  if (!resident?.stripe_customer_id || !resident?.stripe_payment_method_id) {
    return NextResponse.json({ error: 'no payment method on file' }, { status: 400 });
  }
  if (!operator?.stripe_account_id || !operator?.stripe_onboarding_complete) {
    return NextResponse.json({ error: 'operator not connected' }, { status: 400 });
  }
  const grossCents = resident.package?.price_cents;
  if (!grossCents) return NextResponse.json({ error: 'no package price' }, { status: 400 });

  const { fee } = calculateFee(grossCents);

  try {
    const intent = await stripe.paymentIntents.create({
      amount: grossCents,
      currency: 'usd',
      customer: resident.stripe_customer_id,
      payment_method: resident.stripe_payment_method_id,
      off_session: true,
      confirm: true,
      application_fee_amount: fee,
      transfer_data: { destination: operator.stripe_account_id },
      metadata: { wash_id: washRecordId },
    });
    return NextResponse.json({ paymentIntentId: intent.id, status: intent.status });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
