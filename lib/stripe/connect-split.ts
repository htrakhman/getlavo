import { calculateFee } from '@/lib/fee';

/**
 * How a resident's payment is divided between the operator and Lavo.
 *
 * Every resident payment is a Connect *destination charge*: the money lands in
 * Lavo's account, Stripe moves the operator's share to their connected account
 * automatically, and Lavo keeps the 10% take rate (lib/fee.ts).
 *
 * The way that share is expressed matters, and getting it wrong is the bug this
 * module exists to prevent. Booking checkout used to say
 *
 *     transfer_data: { destination, amount: netCents }
 *
 * which moves the right 90% to the operator but leaves Lavo's 10% as an
 * unlabelled remainder on the platform balance — no Application Fee object, so
 * the take rate appears nowhere in Connect's collected-fees reporting (it looks
 * like the 10% was never taken at all), and a refund asking for
 * `refund_application_fee` fails because there is no application fee to refund.
 *
 * Stating `application_fee_amount` instead produces the identical transfer —
 * Stripe sends the operator gross minus the fee — while recording the 10% as a
 * real application fee that reports and reverses like one.
 *
 * Note on Stripe's own processing fee (2.9% + 30¢): on a destination charge it
 * comes out of the platform balance, not the operator's. The operator receives
 * exactly their 90%; Lavo's 10% is gross, and processing is paid from it. On a
 * normal $25–$70 wash that nets out fine. On a $1.00 test booking the 33¢
 * processing fee exceeds the 10¢ take rate, so the platform nets a loss — the
 * arithmetic of the test, not a fault in the split.
 */
export type PaymentSplit = {
  grossCents: number;
  feeCents: number;
  netCents: number;
};

/**
 * The split for a payment of `grossCents`. `storedFeeCents` is the fee already
 * computed and written on the booking row — passing it keeps Stripe and the
 * database quoting the same number instead of recomputing and drifting. A
 * missing, negative or impossible stored fee falls back to the take rate.
 */
export function resolveSplit(grossCents: number, storedFeeCents?: number | null): PaymentSplit {
  const gross = Math.max(0, Math.round(grossCents));
  const fallback = calculateFee(gross).fee;
  const stored =
    typeof storedFeeCents === 'number' && Number.isFinite(storedFeeCents)
      ? Math.round(storedFeeCents)
      : null;
  // A fee at or above the gross would leave the operator nothing for work they
  // are about to perform, and Stripe rejects it outright.
  const feeCents = stored != null && stored >= 0 && stored < gross ? stored : fallback;
  return { grossCents: gross, feeCents, netCents: gross - feeCents };
}

/**
 * The `payment_intent_data` fields that make a destination charge pay the
 * operator their share and record Lavo's take rate as an application fee.
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
