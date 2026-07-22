import { NextResponse } from 'next/server';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { stripeClient } from '@/lib/stripe/connect';

export async function GET() {
  const session = await getSessionUser();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (!session || !session.portals.includes('operator')) {
    return NextResponse.redirect(`${appUrl}/login`);
  }

  const sb = supabaseServer();
  const admin = supabaseAdmin();

  const { data: operator } = await sb
    .from('operators')
    .select('id, stripe_account_id')
    .eq('owner_id', session.user.id)
    .single();

  if (operator?.stripe_account_id) {
    try {
      const stripe = stripeClient();
      const account = await stripe.accounts.retrieve(operator.stripe_account_id);
      if (account.charges_enabled) {
        await admin
          .from('operators')
          .update({ stripe_onboarding_complete: true })
          .eq('id', operator.id);
      }
    } catch (err) {
      // Stale/invalid account id (e.g. a test-mode account under a live key)
      // must not crash the return redirect — onboarding will recreate it.
      console.error('stripe connect return retrieve failed:', err);
    }
  }

  return NextResponse.redirect(`${appUrl}/operator`);
}
