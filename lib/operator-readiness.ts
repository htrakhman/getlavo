import { hasApprovedInsurance } from '@/lib/insurance';

/**
 * An operator is listed in the building marketplace as soon as they sign up —
 * a half-finished or not-yet-vetted account is visible, not hidden. What setup
 * gates is whether a building can *request* them, so managers can see who is
 * coming online instead of browsing an empty marketplace.
 *
 * Three things must be true before a request can be sent:
 *   - Lavo has approved the operator's application (status = 'approved').
 *   - Stripe Connect is done — without it there is nowhere to route resident
 *     payments, so a partnership would be inert.
 * Insurance review is surfaced but NOT blocking: it is our own admin queue, and
 * a building shouldn't be stuck waiting on our turnaround to send a request.
 * The service agreement still requires proof of insurance before first service.
 */
export type OperatorSetup = {
  /** True when a building may send this operator a partnership request. */
  requestable: boolean;
  /** Human-readable steps still outstanding, for manager-facing copy. */
  pending: string[];
  /** Certificate of insurance is approved and unexpired. */
  insured: boolean;
  /** Awaiting Lavo's review of the operator application — distinct from unfinished setup. */
  awaitingReview: boolean;
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
  const awaitingReview = op?.status !== 'approved';

  const pending: string[] = [];
  if (awaitingReview) pending.push('Lavo verification');
  if (!stripeDone) pending.push('payment account');
  if (!insured) pending.push('insurance certificate');

  return { requestable: !awaitingReview && stripeDone, pending, insured, awaitingReview };
}

/** "payment account and insurance certificate" — for inline manager-facing copy. */
export function pendingLabel(pending: string[]): string {
  if (pending.length <= 1) return pending[0] ?? '';
  return `${pending.slice(0, -1).join(', ')} and ${pending[pending.length - 1]}`;
}

/** Short chip label for a marketplace card. */
export function setupChipLabel(setup: OperatorSetup): string {
  return setup.awaitingReview ? 'New — in review' : 'Setting up';
}
