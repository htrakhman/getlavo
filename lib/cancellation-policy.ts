/**
 * When a resident can still get their money back.
 *
 * The 24-hour window was published long before it was enforced: the homepage
 * FAQ, /help and the booking form all promised "cancel up to 24 hours before
 * your scheduled slot", while the cancel API refunded any booking at any time —
 * including one being cancelled while the crew was parked outside. This module
 * is the single place that decides, so the copy a resident reads, the button
 * they press and the refund the server issues all come from the same rule.
 *
 * Cancelling itself is never blocked. A resident who can't make it should
 * always be able to call the wash off — the operator needs to know either way,
 * and a booking nobody cancels is an hour the crew holds for a car that isn't
 * coming. What the window governs is the refund, and nothing else.
 *
 * Everything here is pure and client-safe: the booking form and the portal
 * import it to render the same deadline the API enforces. Reading a wash time
 * out of a booking row is lib/wash-time.ts's job, shared with the calendar
 * invites so a slot can't mean one thing here and another there.
 * Regression tests: scripts/cancellation-policy-test.ts.
 */

import { formatInZone, parseSlotHour, zonedWallClockToUtc } from '@/lib/wash-time';

/** Hours before the wash starts after which a cancellation is no longer refundable. */
export const CANCELLATION_CUTOFF_HOURS = 24;

const HOUR_MS = 60 * 60 * 1000;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The instant a booking's wash window opens.
 *
 * A booking with no time slot isn't scheduled for an hour, it's scheduled for a
 * day — the crew can arrive at the start of it, so the day itself is what the
 * cutoff is measured against. Returns null only when the date is unparseable,
 * which callers treat as "no refund decision can be made here".
 */
export function bookingStartsAt(
  scheduledFor: string,
  timeSlot?: string | null,
): Date | null {
  if (!DATE_ONLY.test(scheduledFor ?? '')) return null;
  const [year, month, day] = scheduledFor.split('-').map((n) => parseInt(n, 10));
  const slot = parseSlotHour(timeSlot);
  return zonedWallClockToUtc(year, month, day, slot?.[0] ?? 0, slot?.[1] ?? 0);
}

export type RefundEligibility = {
  /** Whether cancelling right now still earns a refund. */
  refundable: boolean;
  /** When the wash window opens. */
  startsAt: Date | null;
  /** The last instant a cancellation is refundable. */
  deadline: Date | null;
  /** Hours from now until the wash starts. Negative once it's in the past. */
  hoursUntilStart: number | null;
};

/**
 * Whether a booking scheduled for `scheduledFor`/`timeSlot` can still be
 * refunded at `now`.
 *
 * An unreadable date is not refundable: the server can't prove the booking is
 * outside the window, and issuing money on an unprovable claim is the failure
 * that costs real dollars. It's rare enough that the alternative — silently
 * refunding a wash that starts in ten minutes — is the worse trade.
 */
export function refundEligibility(
  scheduledFor: string,
  timeSlot?: string | null,
  now: Date = new Date(),
): RefundEligibility {
  const startsAt = bookingStartsAt(scheduledFor, timeSlot);
  if (!startsAt) {
    return { refundable: false, startsAt: null, deadline: null, hoursUntilStart: null };
  }
  const deadline = new Date(startsAt.getTime() - CANCELLATION_CUTOFF_HOURS * HOUR_MS);
  return {
    refundable: now.getTime() <= deadline.getTime(),
    startsAt,
    deadline,
    hoursUntilStart: (startsAt.getTime() - now.getTime()) / HOUR_MS,
  };
}

/** The rule, in one sentence. Used at checkout, in the portal and in the terms. */
export const CANCELLATION_POLICY_LINE =
  `Free cancellation with a full refund up to ${CANCELLATION_CUTOFF_HOURS} hours before your wash. ` +
  `Inside ${CANCELLATION_CUTOFF_HOURS} hours you can still cancel, but the booking is not refunded.`;

/** What the resident sees on a specific booking, given where it sits in the window. */
export function cancellationNotice(eligibility: RefundEligibility): string {
  if (eligibility.refundable && eligibility.deadline) {
    return `Free cancellation until ${formatInZone(eligibility.deadline)}.`;
  }
  return `Inside the ${CANCELLATION_CUTOFF_HOURS}-hour window — cancelling now can't be refunded.`;
}
