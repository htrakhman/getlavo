/**
 * Date handling for indexable pages.
 *
 * One ISO string per page feeds three places: the visible "Last updated" line,
 * the `<time datetime>` attribute, and `dateModified` in JSON-LD. Formatting is
 * pinned to UTC and en-US so a page rendered on the build server and hydrated
 * in another timezone produces the same string — a locale-dependent format
 * here would show up as a hydration mismatch and as a date that disagrees with
 * its own schema.
 */

/** `2026-08-03` or a full ISO timestamp. */
export type IsoDate = string;

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const DISPLAY_FORMAT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

function parse(value: IsoDate): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  // A bare date is parsed as UTC midnight by spec; anchoring it explicitly
  // keeps the behavior obvious rather than relying on that rule.
  const parsed = new Date(DATE_ONLY.test(trimmed) ? `${trimmed}T00:00:00Z` : trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isValidIsoDate(value: IsoDate | undefined | null): boolean {
  return Boolean(value && parse(value));
}

/** `2026-08-03` — the value for `<time datetime>` and for JSON-LD. */
export function toIsoDate(value: IsoDate): string {
  const parsed = parse(value);
  if (!parsed) throw new Error(`Invalid date: ${JSON.stringify(value)}`);
  return parsed.toISOString().slice(0, 10);
}

/** `August 3, 2026` — the human-readable form shown on the page. */
export function formatDisplayDate(value: IsoDate): string {
  const parsed = parse(value);
  if (!parsed) throw new Error(`Invalid date: ${JSON.stringify(value)}`);
  return DISPLAY_FORMAT.format(parsed);
}
