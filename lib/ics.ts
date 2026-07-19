/**
 * Calendar-invite helpers for wash bookings. All wash events are in the
 * building's local timezone (the platform operates in New Jersey).
 */

const TZ = 'America/New_York';
const DEFAULT_DURATION_MINS = 60;

export type WashEvent = {
  uid: string;
  title: string;
  description?: string;
  location?: string;
  /** YYYY-MM-DD */
  date: string;
  /** e.g. "9:00 AM" — omitted → all-day event */
  time?: string | null;
  durationMins?: number;
};

function icsEscape(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

/** "9:00 AM" → [9, 0]; null when unparseable. */
export function parseTimeSlot(time: string | null | undefined): [number, number] | null {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec((time ?? '').trim());
  if (!m) return null;
  let h = parseInt(m[1], 10) % 12;
  if (m[3].toUpperCase() === 'PM') h += 12;
  return [h, parseInt(m[2], 10)];
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function localStamp(date: string, h: number, min: number) {
  return `${date.replace(/-/g, '')}T${pad(h)}${pad(min)}00`;
}

/** Builds a VCALENDAR string. `method: 'REQUEST'` makes mail clients render it as an invite. */
export function buildIcs(event: WashEvent, opts: { method?: 'PUBLISH' | 'REQUEST' } = {}): string {
  const method = opts.method ?? 'PUBLISH';
  const parsed = parseTimeSlot(event.time);
  const duration = event.durationMins ?? DEFAULT_DURATION_MINS;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const dtLines = parsed
    ? [
        `DTSTART;TZID=${TZ}:${localStamp(event.date, parsed[0], parsed[1])}`,
        `DTEND;TZID=${TZ}:${localStamp(event.date, parsed[0] + Math.floor((parsed[1] + duration) / 60), (parsed[1] + duration) % 60)}`,
      ]
    : [`DTSTART;VALUE=DATE:${event.date.replace(/-/g, '')}`];

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Lavo//Booking//EN',
    `METHOD:${method}`,
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${stamp}`,
    ...dtLines,
    `SUMMARY:${icsEscape(event.title)}`,
    ...(event.description ? [`DESCRIPTION:${icsEscape(event.description)}`] : []),
    ...(event.location ? [`LOCATION:${icsEscape(event.location)}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.join('\r\n');
}

/** "Add to Google Calendar" deep link for the same event. */
export function googleCalendarUrl(event: WashEvent): string {
  const parsed = parseTimeSlot(event.time);
  const duration = event.durationMins ?? DEFAULT_DURATION_MINS;
  let dates: string;
  if (parsed) {
    const end = [parsed[0] + Math.floor((parsed[1] + duration) / 60), (parsed[1] + duration) % 60] as const;
    dates = `${localStamp(event.date, parsed[0], parsed[1])}/${localStamp(event.date, end[0], end[1])}`;
  } else {
    const d = new Date(`${event.date}T12:00:00Z`);
    const next = new Date(d);
    next.setUTCDate(d.getUTCDate() + 1);
    dates = `${event.date.replace(/-/g, '')}/${next.toISOString().slice(0, 10).replace(/-/g, '')}`;
  }
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates,
    ctz: TZ,
    ...(event.description ? { details: event.description } : {}),
    ...(event.location ? { location: event.location } : {}),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
