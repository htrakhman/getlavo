/**
 * Regression guard for the operator/platform payment split.
 * Run: npx tsx --tsconfig tsconfig.scripts.json scripts/connect-split-test.ts
 *
 * The bug this exists to prevent: booking checkout paid the operator with
 * `transfer_data.amount = netCents`. The operator's 90% arrived, but Lavo's 10%
 * was left as an unlabelled remainder on the platform balance instead of an
 * application fee — so the take rate showed up nowhere in Stripe's Connect
 * reporting (a $1.00 live test in Aug 2026 looked like the 10% was never taken),
 * and refunds asking to reverse the application fee failed because there wasn't
 * one. The checks below pin both halves of every payment: the operator is sent
 * gross minus the take rate, and the take rate is stated as an application fee.
 */

import { destinationChargeParams, resolveSplit } from '../lib/stripe/connect-split';

let failures = 0;
function check(name: string, cond: boolean) {
  if (!cond) {
    console.error(`FAIL: ${name}`);
    failures++;
  }
}

const ACCT = 'acct_test_operator';

function main() {
  // ── the split itself ────────────────────────────────────────────────────
  const dollar = resolveSplit(100);
  check('a $1.00 booking takes 10¢', dollar.feeCents === 10);
  check('a $1.00 booking pays the operator 90¢', dollar.netCents === 90);

  const wash = resolveSplit(7000);
  check('a $70.00 wash takes $7.00', wash.feeCents === 700);
  check('a $70.00 wash pays the operator $63.00', wash.netCents === 6300);

  // Fractional cents round in the operator's favour, never against them.
  const odd = resolveSplit(2599);
  check('an odd amount floors the fee', odd.feeCents === 259);
  check('the two halves always add back to the gross', odd.feeCents + odd.netCents === 2599);

  // ── the fee already written on the booking row is honoured ──────────────
  // The row is what the resident was quoted and what the operator is told they
  // earned; Stripe has to charge that exact number rather than recompute one.
  const promoed = resolveSplit(5000, 400);
  check('a stored fee is used as-is', promoed.feeCents === 400);
  check('a stored fee still leaves the operator the remainder', promoed.netCents === 4600);

  // Garbage in the stored fee falls back to the take rate rather than paying
  // the operator nothing (or more than the resident paid).
  check('a fee at the full gross is rejected', resolveSplit(5000, 5000).feeCents === 500);
  check('a fee above the gross is rejected', resolveSplit(5000, 9999).feeCents === 500);
  check('a negative fee is rejected', resolveSplit(5000, -100).feeCents === 500);
  check('a missing fee falls back to the take rate', resolveSplit(5000, null).feeCents === 500);
  check('a NaN fee falls back to the take rate', resolveSplit(5000, Number.NaN).feeCents === 500);
  check('a zero fee is legitimate and kept', resolveSplit(5000, 0).feeCents === 0);

  // ── what Stripe is actually told ────────────────────────────────────────
  const params = destinationChargeParams(wash, ACCT);
  check('the take rate is stated as an application fee', params.application_fee_amount === 700);
  check('the operator account is the transfer destination', params.transfer_data.destination === ACCT);
  // The exact regression: naming a transfer amount is what hid the fee.
  check(
    'no transfer amount is set — the fee determines the operator’s share',
    !('amount' in (params.transfer_data as Record<string, unknown>)),
  );

  // A free booking never reaches Stripe, but the split must not invent a fee.
  const free = resolveSplit(0);
  check('a $0 booking takes nothing', free.feeCents === 0 && free.netCents === 0);

  if (failures) {
    console.error(`\n${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log('connect split: all checks passed');
}

main();
