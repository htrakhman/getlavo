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
 * import it to render the same deadline the API enforces.
 * Regression tests: scripts/cancellation-policy-test.ts.
 */

/** Hours before the wash starts after which a cancellation is no longer refundable. */
export const CANCELLATION_CUTOFF_HOURS = 24;

/** The platform operates in New Jersey; every wash time is a New York wall clock. */
const TZ = 'America/New_York';

const HOUR_MS = 60 * 60 * 1000;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * How far `TZ` is from UTC at a given instant, in milliseconds (EDT → -4h).
 *
 * Read from Intl rather than hard-coded, so the cutoff lands on the right side
 * of a DST change instead of drifting by an hour twice a year.
 */
function zoneOffsetMs(at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at);

  const field: Record<string, number> = {};
  for (const p of parts) {
    if (p.type !== 'literal') field[p.type] = parseInt(p.value, 10);
  }
  // `hour12: false` renders midnight as 24 in some ICU versions.
  const hour = field.hour === 24 ? 0 : field.hour;
  const asIfUtc = Date.UTC(field.year, field.month - 1, field.day, hour, field.minute, field.second);
  return asIfUtc - at.getTime();
}

/** The UTC instant of a `TZ` wall-clock time. */
function zonedWallClockToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  const asIfUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  // The offset has to be read at the answer, not at the guess, or an instant
  // near a DST boundary resolves against the wrong side of the change. One
  // correction pass gets there: guess in UTC, subtract the offset there, then
  // re-read the offset at that corrected instant.
  const firstPass = asIfUtc - zoneOffsetMs(new Date(asIfUtc));
  return new Date(asIfUtc - zoneOffsetMs(new Date(firstPass)));
}

/**
 * "1:00 PM" → [13, 0]. Bookings store the label the picker showed, but rows
 * predating that — or written by hand — can carry "13:00", so both parse.
 * Returns null for anything else, which reads as a day with no stated time.
 */
export function parseSlotHour(slot: string | null | undefined): [number, number] | null {
  const raw = (slot ?? '').trim();
  if (!raw) return null;

  const twelve = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(raw);
  if (twelve) {
    const stated = parseInt(twelve[1], 10);
    if (stated < 1 || stated > 12) return null;
    let hour = stated % 12;
    if (twelve[3].toUpperCase() === 'PM') hour += 12;
    return [hour, parseInt(twelve[2], 10)];
  }

  const twentyFour = /^(\d{1,2}):(\d{2})$/.exec(raw);
  if (twentyFour) {
    const hour = parseInt(twentyFour[1], 10);
    const minute = parseInt(twentyFour[2], 10);
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) return [hour, minute];
  }

  return null;
}

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

/** "Thu, Aug 6 at 1:00 PM" in the building's zone, for deadline copy. */
export function formatInZone(at: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
    .format(at)
    .replace(/,\s(\d)/, ' at $1');
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
