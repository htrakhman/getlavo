import { hasApprovedInsurance } from '@/lib/insurance';

/**
 * An operator is listed in the building marketplace as soon as their profile
 * exists — a half-finished account is visible, not hidden. What setup gates is
 * whether a building can *request* them, so managers can see who is coming
 * online instead of browsing an empty marketplace.
 *
 * Stripe Connect is the hard gate: without a connected account there is nowhere
 * to route resident payments, so a partnership would be inert. Insurance review
 * is surfaced but not blocking — it is an admin-review queue, and a building
 * shouldn't be stuck waiting on our own turnaround to send a request.
 */
export type OperatorSetup = {
  /** True when a building may send this operator a partnership request. */
  requestable: boolean;
  /** Human-readable setup steps the operator still owes, for manager-facing copy. */
  pending: string[];
  /** Certificate of insurance is approved and unexpired. */
  insured: boolean;
};

export function operatorSetup(
  op:
    | {
        stripe_onboarding_complete?: boolean | null;
        insurance_review_status?: string | null;
        insurance_expires_at?: string | null;
        status?: string | null;
      }
    | null
    | undefined,
): OperatorSetup {
  const insured = hasApprovedInsurance(op);
  const stripeDone = !!op?.stripe_onboarding_complete;

  const pending: string[] = [];
  if (!stripeDone) pending.push('payment account');
  if (!insured) pending.push('insurance certificate');

  return { requestable: stripeDone, pending, insured };
}

/** "payment account and insurance certificate" — for inline manager-facing copy. */
export function pendingLabel(pending: string[]): string {
  if (pending.length <= 1) return pending[0] ?? '';
  return `${pending.slice(0, -1).join(', ')} and ${pending[pending.length - 1]}`;
}
