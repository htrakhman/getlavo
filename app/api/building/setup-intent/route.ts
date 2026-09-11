import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSessionUser } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * A SetupIntent for the property's card, against a Stripe customer that
 * belongs to the building rather than to whoever is signed in. Managers
 * change; the card that funds an amenity should not leave with them.
 */
export async function POST() {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Payments are not configured.' }, { status: 503 });
    }
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const admin = supabaseAdmin();
    const { buildingId } = await currentBuilding(admin, session.user.id);
    if (!buildingId) {
      return NextResponse.json({ error: 'No building selected.' }, { status: 404 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
    const { data: building } = await admin
      .from('buildings')
      .select('id, name, stripe_customer_id')
      .eq('id', buildingId)
      .maybeSingle();
    if (!building) return NextResponse.json({ error: 'Building not found.' }, { status: 404 });

    let customerId = building.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: building.name ?? undefined,
        email: session.profile.email ?? undefined,
        metadata: { building_id: building.id },
      });
      customerId = customer.id;
      await admin.from('buildings').update({ stripe_customer_id: customerId }).eq('id', building.id);
    }

    const intent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      // The card is charged when an occupant books and nobody from the
      // property is present, so it has to be set up for off-session use.
      usage: 'off_session',
      metadata: { building_id: building.id },
    });

    return NextResponse.json({ clientSecret: intent.client_secret });
  } catch (e) {
    console.error('building setup-intent failed:', e);
    const message =
      e instanceof Stripe.errors.StripeError
        ? `Payment provider error: ${e.message}`
        : 'Could not initialize the payment form. Please try again.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** The building this manager currently has selected, verified as theirs. */
async function currentBuilding(admin: ReturnType<typeof supabaseAdmin>, profileId: string) {
  const { getCurrentBuildingForSession } = await import('@/lib/building');
  const { current } = await getCurrentBuildingForSession(profileId);
  return { buildingId: current?.id ?? null };
}
