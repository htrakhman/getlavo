import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSessionUser } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST() {
  // Any uncaught throw here used to surface as a plain-text 500, which the
  // card form could only render as "Network error". Always answer with JSON.
  try {
    return await createSetupIntent();
  } catch (e) {
    console.error('setup-intent failed:', e);
    const message =
      e instanceof Stripe.errors.StripeError
        ? `Payment provider error: ${e.message}`
        : 'Could not initialize the payment form. Please try again.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function createSetupIntent() {
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

  async function newCustomerId() {
    const customer = await stripe.customers.create({
      email: session!.profile.email,
      name: session!.profile.full_name,
      metadata: { resident_id: resident!.id },
    });
    await admin.from('residents').update({ stripe_customer_id: customer.id }).eq('id', resident!.id);
    return customer.id;
  }

  let customerId = resident.stripe_customer_id ?? (await newCustomerId());

  let intent;
  try {
    intent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session',
      metadata: { resident_id: resident.id },
    });
  } catch (e) {
    // A stored customer id can be stale (deleted, or created under a different
    // Stripe mode/account). Recreate the customer once and retry instead of
    // bricking the card form for that resident.
    const staleCustomer =
      e instanceof Stripe.errors.StripeInvalidRequestError &&
      (e.code === 'resource_missing' && e.param === 'customer');
    if (!staleCustomer) throw e;
    customerId = await newCustomerId();
    intent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session',
      metadata: { resident_id: resident.id },
    });
  }

  return NextResponse.json({ clientSecret: intent.client_secret, customerId });
}
