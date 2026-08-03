import { CANCELLATION_CUTOFF_HOURS } from '@/lib/cancellation-policy';

/**
 * What a resident is agreeing to when they book a wash.
 *
 * These four points were each true and each enforced, but they lived in four
 * different places — the cancellation window in marketing copy, the key hand-off
 * in a calendar invite, the liability waiver in a first-booking checkbox, the
 * charge authorization nowhere at all. A resident could pay without ever being
 * shown the rule that decides whether they get their money back.
 *
 * Now they're one list, shown on every booking above the button that spends the
 * money, and the same list is what the API records as accepted. Bump the
 * version whenever the wording changes materially — the acceptance is written
 * to the audit log against the booking it was given for, so what a specific
 * resident agreed to on a specific wash stays answerable later.
 */
export const BOOKING_TERMS_VERSION = '2026-08-03';

export type BookingTerm = {
  /** Stable identifier, recorded on acceptance so a reworded point stays traceable. */
  key: string;
  text: string;
};

export function bookingTerms(): BookingTerm[] {
  return [
    {
      key: 'charge',
      text: 'I authorize Lavo to charge my payment method for the total shown above.',
    },
    {
      key: 'cancellation',
      text:
        `I can cancel for a full refund up to ${CANCELLATION_CUTOFF_HOURS} hours before my wash. ` +
        `Inside ${CANCELLATION_CUTOFF_HOURS} hours I can still cancel, but the booking is not refunded.`,
    },
    {
      key: 'keys',
      text:
        'My keys need to be at the front desk before my window. If the operator can’t get my keys ' +
        'the wash can’t happen, and the booking is not refunded.',
    },
    {
      key: 'liability',
      text:
        'An independent operator performs this service. Lavo and my building are not liable for ' +
        'vehicle damage, and the operator may enter the garage or lot to reach my car.',
    },
  ];
}

/** The keys above, for the acceptance record. */
export function bookingTermKeys(): string[] {
  return bookingTerms().map((t) => t.key);
}
