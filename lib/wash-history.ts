/**
 * What belongs in a resident's wash history, and what it should be called.
 *
 * A `washes` row is created the moment a resident is rostered onto a wash day,
 * so the table holds future washes as well as past ones. Listing it verbatim
 * put the resident's *next* wash at the top of "Wash history" as a "scheduled"
 * entry — the same wash the page had just announced as upcoming — and made a
 * brand-new resident look like they already had a wash behind them (QA, Aug
 * 2026: one Aug 7 booking showing as both "Next wash" and "Wash history").
 *
 * History is only what already happened: a wash that reached an outcome, or one
 * whose wash day is behind us. Everything else is still the future.
 *
 * The other half is the label. A wash the crew never marked stays 'scheduled'
 * in the database forever, so a wash day that came and went reads as if it were
 * still coming. Past-dated rows are labelled by what actually happened to them
 * — including the resident's own skip, which is recorded in `wash_skips` and
 * never written back to the wash row.
 */

/** Statuses that mean the wash is done being scheduled, whatever the date. */
const RESOLVED = new Set(['completed', 'skipped', 'flagged']);

export type HistoryWash = {
  status: string;
  completed_at?: string | null;
  wash_day_id?: string | null;
  wash_day?: { scheduled_for?: string | null } | null;
};

const dayOf = (v?: string | null) => (v ? v.slice(0, 10) : null);

/**
 * The calendar day a wash belongs to. The wash day is the truth; `completed_at`
 * is the fallback for rows whose wash day went away.
 */
export function washDate(w: HistoryWash): string | null {
  return dayOf(w.wash_day?.scheduled_for) ?? dayOf(w.completed_at);
}

/**
 * True once a wash is part of the past — resolved, or dated before today.
 * A wash still scheduled or in progress today is the current wash, not history.
 */
export function isPastWash(w: HistoryWash, today: string): boolean {
  if (RESOLVED.has(w.status)) return true;
  const d = washDate(w);
  return !!d && d < today;
}

/** Past washes only, newest first, capped at `limit`. */
export function washHistory<T extends HistoryWash>(
  rows: T[] | null | undefined,
  today: string,
  limit: number
): T[] {
  return (rows ?? [])
    .filter((w) => isPastWash(w, today))
    .sort(
      (a, b) =>
        (washDate(b) ?? '').localeCompare(washDate(a) ?? '') ||
        (b.completed_at ?? '').localeCompare(a.completed_at ?? '')
    )
    .slice(0, limit);
}

/**
 * What happened, in the resident's terms. `skipped` is the resident's own skip
 * for that wash day, which lives in `wash_skips` rather than on the wash row.
 * A past wash nobody recorded says so instead of claiming to be scheduled.
 */
export function washOutcome(w: HistoryWash, skipped = false): string {
  if (RESOLVED.has(w.status)) return w.status;
  if (skipped) return 'skipped';
  return 'not recorded';
}
