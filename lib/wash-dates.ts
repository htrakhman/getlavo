/**
 * Helpers for the jsonb date-list columns (buildings.requested_wash_dates,
 * operators.availability_dates). Values are ISO YYYY-MM-DD strings.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Parse an unknown jsonb value into a sorted, de-duplicated list of ISO dates. */
export function parseDateList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  for (const v of value) {
    if (typeof v === 'string' && ISO_DATE.test(v)) seen.add(v);
  }
  return [...seen].sort();
}

/** Keep only today-or-later dates. */
export function futureDates(dates: string[]): string[] {
  const today = new Date().toISOString().slice(0, 10);
  return dates.filter((d) => d >= today);
}
