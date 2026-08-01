/**
 * Regression guard for the three-way split of every resident payment.
 * Run: npx tsx --tsconfig tsconfig.scripts.json scripts/connect-split-test.ts
 *
 * Two bugs this exists to prevent, both found on a $1.00 live booking in
 * Aug 2026:
 *
 *  1. Checkout paid the operator with `transfer_data.amount`. The operator's
 *     share arrived, but Lavo's was left as an unlabelled remainder on the
 *     platform balance instead of an application fee — invisible in Connect's
 *     fee reporting, and impossible to reverse on refund.
 *  2. The fee covered the take rate only, so Stripe's 2.9% + 30¢ came out of
 *     Lavo's 10%. On that $1.00 booking: 10¢ of revenue against a 33¢
 *     processing bill. Processing is now passed through to the operator.
 *
 * So the invariants below are: gross splits three ways and nothing goes
 * missing, Lavo's take survives at any price, and Stripe is told the total as
 * an application fee rather than a transfer amount.
 */

import { destinationChargeParams, processingFeeCents, resolveSplit } from '../lib/stripe/connect-split';

let failures = 0;
function check(name: string, cond: boolean) {
  if (!cond) {
    console.error(`FAIL: ${name}`);
    failures++;
  }
}

const ACCT = 'acct_test_operator';

function main() {
  // ── processing is Stripe's published card rate ──────────────────────────
  check('a $1.00 payment costs 33¢ to process', processingFeeCents(100) === 33);
  check('a $35.00 payment costs $1.32 to process', processingFeeCents(3500) === 132);
  check('nothing to charge costs nothing to process', processingFeeCents(0) === 0);

  // ── the split ───────────────────────────────────────────────────────────
  const wash = resolveSplit(3500);
  check('a $35.00 wash takes $3.50', wash.takeCents === 350);
  check('a $35.00 wash passes through $1.32 of processing', wash.processingCents === 132);
  check('Stripe is asked for both at once', wash.feeCents === 482);
  check('the operator receives the remainder', wash.netCents === 3018);
  check('the three shares account for the whole payment', 350 + 132 + 3018 === 3500);

  // The exact regression: the take rate has to survive the processing bill.
  // Before this, a $1.00 booking earned 10¢ and cost 33¢.
  const dollar = resolveSplit(100);
  check('a $1.00 booking still leaves Lavo its 10¢', dollar.takeCents === 10);
  check('a $1.00 booking charges its 33¢ of processing to the operator', dollar.processingCents === 33);
  check('a $1.00 booking pays the operator 57¢', dollar.netCents === 57);

  // Lavo's take is never eaten by processing, at any price.
  for (const gross of [50, 100, 500, 2500, 3500, 7000, 25000]) {
    const s = resolveSplit(gross);
    check(
      `at ${gross}¢ the shares still sum to the gross`,
      s.takeCents + s.processingCents + s.netCents === s.grossCents,
    );
    check(`at ${gross}¢ the operator is never paid a negative amount`, s.netCents >= 0);
    check(`at ${gross}¢ Stripe is never asked for more than the charge`, s.feeCents <= s.grossCents);
  }

  // ── the take already written on the booking row is honoured ─────────────
  // The row is what the resident was quoted and what the operator was told they
  // would earn; Stripe has to charge that number rather than recompute one.
  const promoed = resolveSplit(5000, 400);
  check('a stored take is used as-is', promoed.takeCents === 400);
  check('a stored take still carries its processing', promoed.processingCents === 175);
  check('a stored take leaves the operator the remainder', promoed.netCents === 4425);

  // Garbage in the stored take falls back to the take rate rather than paying
  // the operator nothing (or more than the resident paid).
  check('a take at the full gross is rejected', resolveSplit(5000, 5000).takeCents === 500);
  check('a take above the gross is rejected', resolveSplit(5000, 9999).takeCents === 500);
  check('a negative take is rejected', resolveSplit(5000, -100).takeCents === 500);
  check('a missing take falls back to the take rate', resolveSplit(5000, null).takeCents === 500);
  check('a NaN take falls back to the take rate', resolveSplit(5000, Number.NaN).takeCents === 500);
  check('a zero take is legitimate and kept', resolveSplit(5000, 0).takeCents === 0);

  // ── what Stripe is actually told ────────────────────────────────────────
  const params = destinationChargeParams(wash, ACCT);
  check('take and processing are collected as one application fee', params.application_fee_amount === 482);
  check('the operator account is the transfer destination', params.transfer_data.destination === ACCT);
  // The other half of the regression: naming a transfer amount is what hid the
  // fee from Connect reporting in the first place.
  check(
    'no transfer amount is set — the fee determines the operator’s share',
    !('amount' in (params.transfer_data as Record<string, unknown>)),
  );

  // A free booking never reaches Stripe, and must not invent a fee on the way.
  const free = resolveSplit(0);
  check('a $0 booking splits into nothing', free.takeCents === 0 && free.processingCents === 0 && free.netCents === 0);

  if (failures) {
    console.error(`\n${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log('connect split: all checks passed');
}

main();
