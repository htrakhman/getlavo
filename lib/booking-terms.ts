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
export const BOOKING_TERMS_VERSION = '2026-09-11';

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
      // The Occupant is not a party to the service agreement between the
      // property and the operator, so nothing in that document binds them.
      // This checkbox is the only place an Occupant agrees to anything, which
      // makes it the only place their claim for a damaged car can be directed
      // at the party who actually washed it.
      key: 'liability',
      text:
        'The wash is performed by an independent operator, not by Lavo or by the property. ' +
        'The operator is solely responsible for my vehicle, anything inside it, and any damage or ' +
        'injury arising from the service, and carries insurance for it. I will bring any such claim ' +
        'against the operator, not against Lavo or the property, and I agree that neither Lavo nor ' +
        'the property is liable for it.',
    },
    {
      key: 'access',
      text:
        'The operator may enter the parking area to reach my vehicle, and I confirm I am authorized ' +
        'to have it washed.',
    },
    {
      key: 'valuables',
      text:
        'I will remove valuables from my vehicle before the wash. Nobody is responsible for items ' +
        'left inside it.',
    },
  ];
}

/** The keys above, for the acceptance record. */
export function bookingTermKeys(): string[] {
  return bookingTerms().map((t) => t.key);
}
