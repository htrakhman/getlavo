import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';

// Generates a one-time login link to the operator's Stripe Express dashboard.
// Stripe Express dashboard is where operators see payouts, taxes (1099-K), and account details.
export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.redirect(`${appUrl()}/login`);

  if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: 'stripe not configured' }, { status: 503 });
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

  const sb = supabaseServer();
  const { data: op } = await sb.from('operators').select('stripe_account_id').eq('owner_id', session.user.id).maybeSingle();
  if (!op?.stripe_account_id) {
    return NextResponse.redirect(`${appUrl()}/operator?stripe=missing`);
  }

  try {
    const link = await stripe.accounts.createLoginLink(op.stripe_account_id);
    return NextResponse.redirect(link.url);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
}
