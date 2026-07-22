import Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';

const API_VERSION = '2024-06-20';

export function stripeClient(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: API_VERSION });
}

export function isTestKey(key = process.env.STRIPE_SECRET_KEY ?? ''): boolean {
  return key.startsWith('sk_test_') || key.startsWith('rk_test_');
}

/**
 * Guard against onboarding operators into Stripe's test sandbox from a real
 * deployment. If a production build is configured with a test key, operators
 * get sent to "You're using a test account with test data" and any real bank
 * details they enter go nowhere. Returns an actionable error message when
 * misconfigured, or null when it's safe to proceed.
 */
export function connectConfigError(): string | null {
  if (!process.env.STRIPE_SECRET_KEY) {
    return 'Payments are not set up yet (STRIPE_SECRET_KEY is missing).';
  }
  if (process.env.NODE_ENV === 'production' && isTestKey()) {
    return 'Payment setup is temporarily unavailable while we finish connecting our live bank system. Please try again shortly.';
  }
  return null;
}

type OperatorRow = { id: string; stripe_account_id: string | null; name?: string | null };

/**
 * Return a Connect account id that is valid under the *current* Stripe key.
 *
 * A stored account id created under a different key/mode — e.g. a leftover
 * test-mode account after switching to live keys — does not exist under the
 * current key, so Stripe rejects it with `resource_missing`. When that
 * happens (or when no account exists yet) create a fresh account and persist
 * it, resetting onboarding progress so the operator restarts cleanly.
 */
export async function ensureConnectedAccount(
  stripe: Stripe,
  admin: SupabaseClient,
  operator: OperatorRow,
  email: string | null | undefined
): Promise<string> {
  if (operator.stripe_account_id) {
    try {
      const account = await stripe.accounts.retrieve(operator.stripe_account_id);
      if (!(account as { deleted?: boolean }).deleted) return operator.stripe_account_id;
    } catch (err: unknown) {
      const e = err as { code?: string; type?: string };
      // Only recreate when the account genuinely doesn't exist under this key.
      if (e?.code !== 'resource_missing' && e?.type !== 'StripeInvalidRequestError') {
        throw err;
      }
    }
  }

  const account = await stripe.accounts.create({
    type: 'express',
    email: email ?? undefined,
    business_profile: operator.name ? { name: operator.name } : undefined,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });

  await admin
    .from('operators')
    .update({ stripe_account_id: account.id, stripe_onboarding_complete: false })
    .eq('id', operator.id);

  return account.id;
}
