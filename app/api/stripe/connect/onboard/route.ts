import { NextResponse } from 'next/server';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { stripeClient, connectConfigError, ensureConnectedAccount } from '@/lib/stripe/connect';

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  try {
    const session = await getSessionUser();
    if (!session || !session.portals.includes('operator')) {
      return NextResponse.redirect(`${appUrl}/login`);
    }

    // Never send an operator to Stripe's test sandbox from a live deployment.
    const configError = connectConfigError();
    if (configError) {
      console.error('stripe connect onboard blocked:', configError, {
        nodeEnv: process.env.NODE_ENV,
        testKey: (process.env.STRIPE_SECRET_KEY ?? '').startsWith('sk_test_'),
      });
      const encoded = encodeURIComponent(configError.slice(0, 200));
      return NextResponse.redirect(`${appUrl}/operator?stripe_error=1&stripe_msg=${encoded}`);
    }

    const stripe = stripeClient();
    const sb = supabaseServer();
    const admin = supabaseAdmin();

    const { data: operator } = await sb
      .from('operators')
      .select('id, stripe_account_id, name')
      .eq('owner_id', session.user.id)
      .single();
    if (!operator) return NextResponse.json({ error: 'Operator not found' }, { status: 404 });

    // Reuse the operator's account if it exists under the current key; a stale
    // test-mode account (from before live keys were deployed) is recreated.
    const accountId = await ensureConnectedAccount(stripe, admin, operator, session.profile.email);

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${appUrl}/api/stripe/connect/onboard`,
      return_url: `${appUrl}/api/stripe/connect/return`,
      type: 'account_onboarding',
    });

    return NextResponse.redirect(accountLink.url);
  } catch (err: any) {
    const msg = err?.message ?? 'unknown error';
    console.error('stripe connect onboard error:', msg, err);
    const encoded = encodeURIComponent(msg.slice(0, 200));
    return NextResponse.redirect(`${appUrl}/operator?stripe_error=1&stripe_msg=${encoded}`);
  }
}
