export const money = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

/**
 * A license plate is optional. Returns null when there is nothing real to show,
 * so callers can drop the separator entirely rather than printing a dangling
 * "·" or a placeholder that reads like data. Legacy rows stored the literal
 * 'UNKNOWN' sentinel before the plate column became nullable — treat those as
 * blank too, so display stays correct regardless of migration state.
 */
export const plateLabel = (p?: string | null): string | null => {
  const t = p?.trim();
  if (!t || t.toUpperCase() === 'UNKNOWN') return null;
  return t;
};

// Date-only strings (YYYY-MM-DD) are parsed by `new Date()` as UTC midnight, then
// rendered in the viewer's local zone — which slides the calendar day backwards in
// any timezone behind UTC (e.g. Aug 15 shows as Aug 14 in US zones). Parse those as
// local midnight so the stored calendar date displays unchanged. Full timestamps
// (with a time component) keep their normal instant-based behavior.
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export const dateShort = (d: string | Date) => {
  const date = typeof d === 'string' && DATE_ONLY.test(d) ? new Date(`${d}T00:00:00`) : new Date(d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

