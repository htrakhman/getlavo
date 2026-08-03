/**
 * When cancelling a wash gets the money back.
 *
 * A resident can call off a wash at any time, but the operator's crew is
 * committed to a slot a day out — so the refund is what the window governs, not
 * the cancellation. Cancel with 24 hours or more to spare and the charge is
 * refunded in full; cancel inside that window and the booking is still cancelled
 * (the roster, the calendars and both inboxes all update) but the charge stands.
 *
 * The one rule everything here exists to keep: nothing tells a resident they
 * were refunded unless a refund actually went out. The copy on the button, in
 * the email and in the inbox row all read off this module, so a change to the
 * policy can't leave one of them promising money that never moves.
 */

import { WASH_TZ, parseTimeSlot } from '@/lib/ics';

/** Hours of notice a booking needs for its charge to come back. */
export const REFUND_WINDOW_HOURS = 24;

/**
 * Wall-clock offset of the wash timezone at a given instant, in ms.
 * Reading the instant back through Intl is the only way to get this without a
 * timezone library, and it has to be per-instant: the offset moves by an hour
 * across a DST boundary, which is exactly where a fixed offset would put the
 * cutoff on the wrong side of a booking.
 */
function zoneOffsetMs(at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: WASH_TZ,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? '0');
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour') % 24,
    get('minute'),
    get('second'),
  );
  return asUtc - at.getTime();
}

/** A wall-clock time in the wash timezone → the instant it happens. */
function zonedTime(date: string, hour: number, minute: number): Date {
  const [y, m, d] = date.split('-').map(Number);
  const wall = Date.UTC(y, (m || 1) - 1, d || 1, hour, minute);
  // Correct the naive reading by the offset, then re-check: the first offset was
  // sampled an hour or so off the true instant, which only changes the answer
  // when the two land on opposite sides of a DST change.
  const first = zoneOffsetMs(new Date(wall));
  const candidate = wall - first;
  const second = zoneOffsetMs(new Date(candidate));
  return new Date(second === first ? candidate : wall - second);
}

/**
 * The instant a booking's wash window opens, in real time.
 *
 * A booking with no time slot is treated as starting at midnight on its date:
 * without an hour we can't rule out an early crew, so the whole day is inside
 * the window from the previous midnight on.
 */
export function washStartsAt(scheduledFor: string, timeSlot?: string | null): Date {
  const parsed = parseTimeSlot(timeSlot);
  return zonedTime(scheduledFor, parsed?.[0] ?? 0, parsed?.[1] ?? 0);
}

export type CancellationWindow = {
  /** Whether cancelling right now returns the money. */
  refundable: boolean;
  /** When the wash itself starts. */
  washStartsAt: Date;
  /** The last instant a cancellation is still refunded. */
  cutoffAt: Date;
};

export function cancellationWindow(
  scheduledFor: string,
  timeSlot?: string | null,
  now: Date = new Date(),
): CancellationWindow {
  const start = washStartsAt(scheduledFor, timeSlot);
  const cutoffAt = new Date(start.getTime() - REFUND_WINDOW_HOURS * 3600_000);
  // Exactly 24 hours out still counts as 24 hours of notice.
  return { refundable: now.getTime() <= cutoffAt.getTime(), washStartsAt: start, cutoffAt };
}

/** Shorthand for the one field callers usually want. */
export function isRefundableCancellation(
  scheduledFor: string,
  timeSlot?: string | null,
  now: Date = new Date(),
): boolean {
  return cancellationWindow(scheduledFor, timeSlot, now).refundable;
}

/**
 * How a cancellation settled. `undefined` means there was no charge to settle —
 * an unpaid booking has nothing to say about refunds either way.
 */
export type RefundOutcome = 'issued' | 'withheld_late';

/** The single sentence every surface uses to explain the outcome. */
export function refundOutcomeCopy(outcome: RefundOutcome): string {
  return outcome === 'issued'
    ? 'A refund is on its way to your original payment method.'
    : `Cancelling within ${REFUND_WINDOW_HOURS} hours of the wash means it isn't refunded.`;
}
