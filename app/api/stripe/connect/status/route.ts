import { NextResponse } from 'next/server';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { stripeClient, connectConfigError } from '@/lib/stripe/connect';
import { accountStatus } from '@/lib/stripe/requirements';

export const dynamic = 'force-dynamic';

/**
 * Reports the operator's real Stripe onboarding status so the profile page can
 * show an in-app popup of what's still missing instead of dumping the raw
 * Stripe error ("Cannot create a login link for an account that has not
 * completed onboarding") on a blank page.
 *
 * When the account is fully onboarded it also returns a one-time dashboard
 * login link so the same click can open the Express dashboard. The stored
 * `stripe_onboarding_complete` flag is reconciled to Stripe's truth on every
 * call, fixing accounts that were marked "Connected" prematurely.
 */
export async function GET() {
  const session = await getSessionUser();
  if (!session || !session.portals.includes('operator')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const configError = connectConfigError();
  if (configError) {
    return NextResponse.json({ connected: false, onboarded: false, missing: [], error: configError });
  }

  const sb = supabaseServer();
  const admin = supabaseAdmin();
  const { data: op } = await sb
    .from('operators')
    .select('id, stripe_account_id, stripe_onboarding_complete')
    .eq('owner_id', session.user.id)
    .maybeSingle();

  if (!op?.stripe_account_id) {
    return NextResponse.json({ connected: false, onboarded: false, missing: [] });
  }

  try {
    const stripe = stripeClient();
    const account = await stripe.accounts.retrieve(op.stripe_account_id);
    const status = accountStatus(account);

    // Keep the local "Connected" flag honest with Stripe.
    if (status.onboarded !== !!op.stripe_onboarding_complete) {
      await admin
        .from('operators')
        .update({ stripe_onboarding_complete: status.onboarded })
        .eq('id', op.id);
    }

    let dashboardUrl: string | null = null;
    if (status.onboarded) {
      try {
        const link = await stripe.accounts.createLoginLink(op.stripe_account_id);
        dashboardUrl = link.url;
      } catch {
        // Fall through: report as not-onboarded rather than 500.
      }
    }

    return NextResponse.json({
      connected: true,
      onboarded: status.onboarded && !!dashboardUrl,
      chargesEnabled: status.chargesEnabled,
      payoutsEnabled: status.payoutsEnabled,
      detailsSubmitted: status.detailsSubmitted,
      missing: status.missing,
      disabledReason: status.disabledReason,
      dashboardUrl,
    });
  } catch (e: any) {
    return NextResponse.json({ connected: true, onboarded: false, missing: [], error: e?.message ?? 'Could not reach Stripe' }, { status: 200 });
  }
}
