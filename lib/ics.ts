/**
 * Calendar-invite helpers for wash bookings. All wash events are in the
 * building's local timezone (the platform operates in New Jersey).
 */

const TZ = 'America/New_York';
const DEFAULT_DURATION_MINS = 60;

export type CalendarPerson = {
  email: string;
  name?: string | null;
};

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
  /** Who the invite is from. Required for METHOD:REQUEST to render as an invite. */
  organizer?: CalendarPerson;
  /** Who the invite is addressed to. Required for METHOD:REQUEST to render as an invite. */
  attendee?: CalendarPerson;
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

/**
 * End clock time for a slot, clamped to 23:59 on the same day. A late slot plus
 * the wash duration used to roll past midnight and emit an hour of "24", which
 * is not a valid ICS timestamp and made the whole event unparseable.
 */
function endClock(startH: number, startMin: number, durationMins: number): [number, number] {
  const total = Math.min(startH * 60 + startMin + durationMins, 23 * 60 + 59);
  return [Math.floor(total / 60), total % 60];
}

/**
 * Parameter values (CN=…) can't carry the structural characters of the
 * content line, and quoting rules differ from the text escaping above.
 */
function paramValue(s: string) {
  return s.replace(/[",;:\r\n]/g, ' ').replace(/\s+/g, ' ').trim();
}

function personLines(
  prop: 'ORGANIZER' | 'ATTENDEE',
  person: CalendarPerson | undefined,
): string[] {
  if (!person?.email) return [];
  const cn = person.name ? `;CN=${paramValue(person.name)}` : '';
  const extra =
    prop === 'ATTENDEE' ? ';ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE' : '';
  return [`${prop}${cn}${extra}:mailto:${person.email}`];
}

/** Builds a VCALENDAR string. `method: 'REQUEST'` makes mail clients render it as an invite. */
export function buildIcs(event: WashEvent, opts: { method?: 'PUBLISH' | 'REQUEST' } = {}): string {
  const method = opts.method ?? 'PUBLISH';
  const parsed = parseTimeSlot(event.time);
  const duration = event.durationMins ?? DEFAULT_DURATION_MINS;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const dtLines = parsed
    ? (() => {
        const [endH, endMin] = endClock(parsed[0], parsed[1], duration);
        return [
          `DTSTART;TZID=${TZ}:${localStamp(event.date, parsed[0], parsed[1])}`,
          `DTEND;TZID=${TZ}:${localStamp(event.date, endH, endMin)}`,
        ];
      })()
    : [`DTSTART;VALUE=DATE:${event.date.replace(/-/g, '')}`];

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Lavo//Booking//EN',
    `METHOD:${method}`,
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${stamp}`,
    'SEQUENCE:0',
    'STATUS:CONFIRMED',
    ...dtLines,
    `SUMMARY:${icsEscape(event.title)}`,
    ...(event.description ? [`DESCRIPTION:${icsEscape(event.description)}`] : []),
    ...(event.location ? [`LOCATION:${icsEscape(event.location)}`] : []),
    // Gmail and Google Calendar only render a METHOD:REQUEST as an actionable
    // invite when it names both an organizer and an attendee; without them the
    // file degrades to a plain attachment the recipient has to open by hand.
    ...personLines('ORGANIZER', event.organizer),
    ...personLines('ATTENDEE', event.attendee),
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
    const end = endClock(parsed[0], parsed[1], duration);
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
