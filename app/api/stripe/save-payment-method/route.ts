import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { paymentMethodId } = await req.json().catch(() => ({}));
  if (!paymentMethodId || typeof paymentMethodId !== 'string') {
    return NextResponse.json({ error: 'missing pm' }, { status: 400 });
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'stripe not configured' }, { status: 503 });
  }

  const sb = supabaseServer();
  const admin = supabaseAdmin();

  const { data: resident } = await sb
    .from('residents')
    .select('id, stripe_customer_id')
    .eq('profile_id', session.user.id)
    .maybeSingle();
  if (!resident) return NextResponse.json({ error: 'no resident' }, { status: 404 });
  if (!resident.stripe_customer_id) {
    return NextResponse.json({ error: 'no stripe customer' }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20.acacia' as any });
  let pm: Stripe.PaymentMethod;
  try {
    pm = await stripe.paymentMethods.retrieve(paymentMethodId);
  } catch {
    return NextResponse.json({ error: 'invalid payment method' }, { status: 400 });
  }
  if (pm.customer !== resident.stripe_customer_id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  await admin.from('residents').update({ stripe_payment_method_id: paymentMethodId }).eq('id', resident.id);

  return NextResponse.json({ success: true });
}
