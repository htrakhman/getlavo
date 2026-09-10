/**
 * When a wash day is worth driving to.
 *
 * An operator serving a building at $49 a car cannot cover a round trip for a
 * single booking, so each operator sets the number of bookings a day must
 * reach. The rule is checked once, at a fixed cutoff before the day: reach the
 * minimum and the day locks and is served; fall short and it is cancelled, the
 * bookings are refunded, and the slot comes off the operator's calendar.
 *
 * The cutoff exists so the answer is settled early enough to matter — to both
 * sides. It sits outside the resident's own 24-hour refund window
 * (lib/cancellation-policy) on purpose: a resident whose day is cancelled is
 * always made whole, whatever the clock says, because they did not call it off.
 *
 * Everything here is pure and client-safe, so the operator's settings page, the
 * resident's booking form and the sweeper all quote the same numbers.
 * Regression tests: scripts/wash-day-minimum-test.ts.
 */

/** Hours before a wash day when the booking count is judged. */
export const MINIMUM_CUTOFF_HOURS = 48;

const HOUR_MS = 60 * 60 * 1000;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Largest minimum an operator can set — past this a day could never run. */
export const MAX_MINIMUM = 20;

export type WashDayDecision =
  /** No minimum configured, or already met. The day is served. */
  | { verdict: 'runs'; booked: number; required: number }
  /** Short of the minimum, and the cutoff has passed. Cancel it. */
  | { verdict: 'cancel'; booked: number; required: number; short: number }
  /** Short, but there is still time to fill. Leave it alone. */
  | { verdict: 'waiting'; booked: number; required: number; short: number };

/**
 * The instant a wash day's cutoff falls.
 *
 * A wash day is a date, not a time — the crew may arrive at the start of it —
 * so the cutoff is measured from midnight at the top of that day. Returns null
 * when the date is unparseable, which callers treat as "do not act".
 */
export function cutoffAt(scheduledFor: string | null | undefined): Date | null {
  if (!scheduledFor) return null;
  const iso = DATE_ONLY.test(scheduledFor) ? `${scheduledFor}T00:00:00Z` : scheduledFor;
  const start = new Date(iso);
  if (Number.isNaN(start.getTime())) return null;
  return new Date(start.getTime() - MINIMUM_CUTOFF_HOURS * HOUR_MS);
}

/**
 * Decide what happens to one wash day.
 *
 * `booked` counts bookings that will actually be served — a cancelled booking
 * is not a car in the garage, so the caller must not include them.
 */
export function decideWashDay(args: {
  scheduledFor: string | null | undefined;
  booked: number;
  /** The operator's configured minimum. 0, null or undefined disables the rule. */
  minimum: number | null | undefined;
  now?: Date;
}): WashDayDecision {
  const booked = Math.max(0, Math.trunc(args.booked));
  const required = Math.max(0, Math.trunc(args.minimum ?? 0));

  // No minimum set, or the day already earns its trip.
  if (required <= 0 || booked >= required) {
    return { verdict: 'runs', booked, required };
  }

  const short = required - booked;
  const cutoff = cutoffAt(args.scheduledFor);
  // An unreadable date is never grounds for cancelling someone's wash.
  if (!cutoff) return { verdict: 'waiting', booked, required, short };

  const now = args.now ?? new Date();
  return now.getTime() >= cutoff.getTime()
    ? { verdict: 'cancel', booked, required, short }
    : { verdict: 'waiting', booked, required, short };
}

/** "3 more bookings needed" — shared by the resident booking form and the operator's calendar. */
export function shortfallLabel(short: number): string {
  if (short <= 0) return '';
  return short === 1 ? '1 more booking needed' : `${short} more bookings needed`;
}

/** Clamp a user-entered minimum to something a day could actually reach. */
export function normalizeMinimum(value: unknown): number {
  const n = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(MAX_MINIMUM, Math.trunc(n));
}
