/**
 * Wash times: one timezone, one slot parser.
 *
 * These used to exist twice. lib/ics.ts had `TZ` and `parseTimeSlot` for
 * calendar invites; lib/cancellation-policy.ts grew its own `TZ` and
 * `parseSlotHour` for the refund window. The two parsers disagreed — the
 * calendar one accepted "13:00 PM" and read it as 1 PM, while rejecting the
 * "13:00" that some booking rows actually carry; the policy one did the
 * opposite. So a booking stored as "13:00" was a 1 PM wash to the refund
 * deadline and an all-day event on the crew's calendar, off the same column.
 *
 * A time string has to mean one thing. Everything that reads `time_slot` goes
 * through here. Pure and client-safe: the booking form and the portal import it
 * to render the same times the server computes.
 * Regression tests: scripts/wash-time-test.ts.
 */

/** The platform operates in New Jersey; every wash time is a New York wall clock. */
export const WASH_TZ = 'America/New_York';

/**
 * How far `WASH_TZ` is from UTC at a given instant, in milliseconds (EDT → -4h).
 *
 * Read from Intl rather than hard-coded, so times land on the right side of a
 * DST change instead of drifting by an hour twice a year.
 */
export function zoneOffsetMs(at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: WASH_TZ,
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

/** The UTC instant of a `WASH_TZ` wall-clock time. */
export function zonedWallClockToUtc(
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
    const minute = parseInt(twelve[2], 10);
    if (minute > 59) return null;
    let hour = stated % 12;
    if (twelve[3].toUpperCase() === 'PM') hour += 12;
    return [hour, minute];
  }

  const twentyFour = /^(\d{1,2}):(\d{2})$/.exec(raw);
  if (twentyFour) {
    const hour = parseInt(twentyFour[1], 10);
    const minute = parseInt(twentyFour[2], 10);
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) return [hour, minute];
  }

  return null;
}

/** "Thu, Aug 6 at 1:00 PM" in the building's zone, for deadline copy. */
export function formatInZone(at: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: WASH_TZ,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
    .format(at)
    .replace(/,\s(\d)/, ' at $1');
}
