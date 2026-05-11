import { NextResponse } from 'next/server';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2024-06-20' });

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const session = await getSessionUser();
  if (!session || !session.portals.includes('operator')) {
    return NextResponse.redirect(`${appUrl}/login`);
  }

  const sb = supabaseServer();
  const admin = supabaseAdmin();

  const { data: operator } = await sb
    .from('operators')
    .select('id, stripe_account_id, name')
    .eq('owner_id', session.user.id)
    .single();
  if (!operator) return NextResponse.json({ error: 'Operator not found' }, { status: 404 });

  let accountId = operator.stripe_account_id;

  // Create Stripe Express account if not yet created
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      email: session.profile.email,
      business_profile: { name: operator.name },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });
    accountId = account.id;
    await admin
      .from('operators')
      .update({ stripe_account_id: accountId })
      .eq('id', operator.id);
  }

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${appUrl}/api/stripe/connect/onboard`,
    return_url: `${appUrl}/api/stripe/connect/return`,
    type: 'account_onboarding',
  });

  return NextResponse.redirect(accountLink.url);
}
