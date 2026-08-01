import { calculateFee } from '@/lib/fee';

/**
 * How a resident's payment is divided three ways: Stripe's processing cost,
 * Lavo's take rate, and the operator's payout.
 *
 * Every resident payment is a Connect *destination charge*: the money lands in
 * Lavo's account, Stripe moves the operator's share to their connected account
 * automatically, and Lavo keeps an application fee.
 *
 * Two things this module exists to get right, both learned the hard way from a
 * $1.00 live booking in Aug 2026:
 *
 * 1. The fee is stated as `application_fee_amount`, never as
 *    `transfer_data.amount`. Naming a transfer amount moves the right money but
 *    leaves Lavo's share as an unlabelled remainder on the platform balance —
 *    no Application Fee object, so the take rate appears nowhere in Connect's
 *    collected-fees reporting, and a refund asking to reverse the application
 *    fee fails because there isn't one.
 *
 * 2. The fee covers Stripe's processing cost as well as the take rate. On a
 *    destination charge Stripe bills the platform (Lavo is the settlement
 *    merchant), so a take rate alone left Lavo paying 2.9% + 30¢ out of its own
 *    10% — on that $1.00 booking, 10¢ of revenue against a 33¢ processing bill,
 *    a net loss of 23¢. Processing is now passed through to the operator, so
 *    Lavo's 10% is what Lavo actually keeps at any price.
 *
 * The operator therefore receives gross minus 10% minus processing. That is the
 * number to quote them — see the operator earnings page and /operators.
 */

/** Stripe's standard US card rate. Link and cards both bill at this rate. */
const STRIPE_PERCENT = 0.029;
const STRIPE_FLAT_CENTS = 30;

export type PaymentSplit = {
  /** What the resident pays. */
  grossCents: number;
  /** Lavo's take rate — the only line here that is revenue. */
  takeCents: number;
  /** Stripe's processing cost, passed through to the operator. */
  processingCents: number;
  /** take + processing: the application fee Stripe is told to collect. */
  feeCents: number;
  /** What the operator receives. */
  netCents: number;
};

/**
 * Stripe's cost for a payment of this size, at the standard US card rate.
 *
 * An estimate, not a lookup: the real cost isn't known until the resident picks
 * a payment method, and an international card or a dispute costs more. Lavo
 * absorbs the difference when the estimate falls short, which is the right way
 * round — the operator is quoted a number before the wash, not billed for
 * whichever card the resident happened to use.
 */
export function processingFeeCents(grossCents: number): number {
  if (grossCents <= 0) return 0;
  return Math.round(grossCents * STRIPE_PERCENT) + STRIPE_FLAT_CENTS;
}

/**
 * The split for a payment of `grossCents`. `storedTakeCents` is Lavo's take as
 * already computed and written on the booking row — passing it keeps Stripe and
 * the database quoting the same number instead of recomputing and drifting. A
 * missing, negative or impossible stored take falls back to the take rate.
 */
export function resolveSplit(grossCents: number, storedTakeCents?: number | null): PaymentSplit {
  const gross = Math.max(0, Math.round(grossCents));
  const fallback = calculateFee(gross).fee;
  const stored =
    typeof storedTakeCents === 'number' && Number.isFinite(storedTakeCents)
      ? Math.round(storedTakeCents)
      : null;
  // A take at or above the gross would leave the operator nothing for work they
  // are about to perform, and Stripe rejects a fee larger than the charge.
  const takeCents = stored != null && stored >= 0 && stored < gross ? stored : fallback;
  const processingCents = processingFeeCents(gross);
  // Stripe rejects an application fee above the charge. Only reachable below
  // Stripe's own 50¢ minimum charge, where the flat 30¢ dominates.
  const feeCents = Math.min(takeCents + processingCents, gross);
  return {
    grossCents: gross,
    takeCents,
    processingCents,
    feeCents,
    netCents: gross - feeCents,
  };
}

/**
 * The `payment_intent_data` fields that make a destination charge pay the
 * operator their share and collect Lavo's fee as an application fee.
 *
 * `destination` is required: a payment with nowhere to send the operator's
 * share is money the operator can never be paid, so callers check for a
 * connected account before charging rather than taking 100% by accident.
 */
export function destinationChargeParams(
  split: PaymentSplit,
  destination: string,
): { application_fee_amount: number; transfer_data: { destination: string } } {
  return {
    application_fee_amount: split.feeCents,
    transfer_data: { destination },
  };
}
