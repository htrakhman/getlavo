import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSessionUser } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST() {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'stripe not configured' }, { status: 503 });
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const admin = supabaseAdmin();

  // Look up via the admin client: RLS-scoped reads of residents have been
  // observed failing silently, which blanked the card form with "no resident".
  // Scoping by the session's profile_id keeps this safe.
  const { data: resident } = await admin
    .from('residents')
    .select('id, stripe_customer_id')
    .eq('profile_id', session.user.id)
    .maybeSingle();
  if (!resident) {
    return NextResponse.json({ error: 'We could not find your resident profile — finish onboarding first.' }, { status: 404 });
  }

  let customerId = resident.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: session.profile.email,
      name: session.profile.full_name,
      metadata: { resident_id: resident.id },
    });
    customerId = customer.id;
    await admin.from('residents').update({ stripe_customer_id: customerId }).eq('id', resident.id);
  }

  const intent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ['card'],
    usage: 'off_session',
    metadata: { resident_id: resident.id },
  });

  return NextResponse.json({ clientSecret: intent.client_secret, customerId });
}
