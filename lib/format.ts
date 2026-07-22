export const money = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

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

