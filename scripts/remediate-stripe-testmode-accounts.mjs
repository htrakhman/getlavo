/**
 * Find operators whose stored Stripe Connect account no longer exists under the
 * *current* (live) Stripe key — i.e. leftover test-mode accounts created while
 * the deployment was misconfigured with an `sk_test_…` key — and clear them so
 * the operator re-onboards cleanly into a fresh live account.
 *
 * Background: a Connect account is permanently tied to the mode (test/live) of
 * the key that created it. Test-mode account ids can never be used with a live
 * key, so retrieving one under the live key throws
 * `StripeInvalidRequestError` ("…was a test account created with a testmode
 * key…"). `ensureConnectedAccount()` already self-heals these lazily the next
 * time the operator clicks "Connect bank account"; this script does the same
 * sweep proactively so operators aren't shown as "connected" to a dead account
 * and so you can see exactly who is affected.
 *
 * SAFETY: this must run against the LIVE key. Run under a test key and every
 * genuine live account would look "missing" and get wrongly cleared, so the
 * script refuses to run when STRIPE_SECRET_KEY is a test key.
 *
 * Usage:
 *   # dry run — report affected operators, change nothing (default):
 *   node --env-file=.env.local scripts/remediate-stripe-testmode-accounts.mjs
 *
 *   # apply — clear stale account ids so operators re-onboard on next click:
 *   node --env-file=.env.local scripts/remediate-stripe-testmode-accounts.mjs --apply
 *
 * Re-running is safe and idempotent: healthy accounts are left untouched.
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const stripeKey = process.env.STRIPE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.');
  process.exit(1);
}
if (!stripeKey) {
  console.error('Missing STRIPE_SECRET_KEY in env.');
  process.exit(1);
}
if (stripeKey.startsWith('sk_test_') || stripeKey.startsWith('rk_test_')) {
  console.error(
    'STRIPE_SECRET_KEY is a TEST key. This sweep must run against the LIVE key,\n' +
      'otherwise every real live account would be misclassified as stale and cleared.\n' +
      'Point STRIPE_SECRET_KEY at the live sk_live_… key and re-run.'
  );
  process.exit(1);
}

const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' });
const sb = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

/**
 * Decide whether a stored account is unusable under the current key.
 * Returns a short reason string when stale, or null when healthy.
 */
async function staleReason(accountId) {
  try {
    const account = await stripe.accounts.retrieve(accountId);
    if (account?.deleted) return 'deleted';
    return null; // exists under the live key → healthy
  } catch (err) {
    const code = err?.code;
    const type = err?.type;
    // Test-mode account under a live key surfaces as StripeInvalidRequestError;
    // a genuinely absent account is resource_missing. Both mean "recreate".
    if (code === 'resource_missing' || type === 'StripeInvalidRequestError') {
      return err?.message ? err.message.slice(0, 140) : 'invalid_request';
    }
    // Network/auth/rate-limit etc. — do NOT treat as stale; surface and skip.
    throw err;
  }
}

async function loadOperators() {
  const rows = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await sb
      .from('operators')
      .select('id, name, stripe_account_id, stripe_onboarding_complete')
      .not('stripe_account_id', 'is', null)
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`operators query failed: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < pageSize) break;
  }
  return rows;
}

const operators = await loadOperators();
console.log(
  `Mode: ${APPLY ? 'APPLY (will clear stale account ids)' : 'DRY RUN (no changes)'} · ` +
    `key: live · operators with a stripe_account_id: ${operators.length}\n`
);

const stale = [];
const errored = [];

for (const op of operators) {
  let reason;
  try {
    reason = await staleReason(op.stripe_account_id);
  } catch (err) {
    errored.push({ op, message: err?.message ?? String(err) });
    console.log(`?  ${op.name ?? op.id} (${op.stripe_account_id}) — check failed: ${err?.message}`);
    continue;
  }
  if (reason) {
    stale.push({ op, reason });
    console.log(`✗  ${op.name ?? op.id} (${op.stripe_account_id}) — STALE: ${reason}`);
  } else {
    console.log(`✓  ${op.name ?? op.id} (${op.stripe_account_id}) — ok`);
  }
}

if (APPLY && stale.length) {
  console.log(`\nClearing ${stale.length} stale account id(s)…`);
  for (const { op } of stale) {
    const { error } = await sb
      .from('operators')
      .update({ stripe_account_id: null, stripe_onboarding_complete: false })
      .eq('id', op.id);
    if (error) {
      console.log(`  ! ${op.name ?? op.id}: update failed — ${error.message}`);
    } else {
      console.log(`  cleared ${op.name ?? op.id} — will get a fresh live account on next onboard`);
    }
  }
}

console.log(
  `\nSummary: ${operators.length} checked · ${stale.length} stale · ` +
    `${errored.length} could not be checked · ` +
    (APPLY
      ? `${stale.length} cleared.`
      : stale.length
        ? `re-run with --apply to clear the stale ids.`
        : `nothing to do.`)
);
