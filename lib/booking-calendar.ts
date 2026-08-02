/**
 * Shared shape of a wash booking's calendar invites and next-step copy.
 *
 * The resident and the operator get different events off the same booking:
 * the resident needs to know what to do before the appointment, the operator
 * needs to know whose car it is and where to find it. Both the confirmation
 * email and the per-booking .ics download build their events from here so the
 * two never drift.
 */

import { buildIcs, type CalendarPerson, type WashEvent } from '@/lib/ics';

/** Where invites appear to come from. Falls back to the shared sending inbox. */
function organizer(): CalendarPerson {
  const from = process.env.RESEND_FROM_EMAIL || 'Lavo <hello@getlavo.io>';
  const match = /<([^>]+)>/.exec(from);
  return { name: 'Lavo', email: match ? match[1] : from };
}

export type BookingCalendarDetails = {
  bookingId: string;
  /** YYYY-MM-DD */
  scheduledFor: string;
  timeSlot?: string | null;
  buildingName?: string | null;
  operatorName?: string | null;
  residentName?: string | null;
  vehicleDesc?: string | null;
  /** Street address of the building, for the event LOCATION. */
  location?: string | null;
  spotLabel?: string | null;
  accessNotes?: string | null;
  addonLabels?: string[];
  /**
   * How many times this booking has moved. Rescheduling re-sends the same UID,
   * so the invite needs a higher SEQUENCE to replace the copy already sitting
   * on the recipient's calendar (see lib/ics.ts).
   */
  sequence?: number;
};

function washWindow(d: BookingCalendarDetails) {
  return d.timeSlot ? `${d.scheduledFor} at ${d.timeSlot}` : d.scheduledFor;
}

/**
 * What the resident has to do before the crew arrives. Keys at the front desk
 * is the only supported access method, and missing that hand-off means the
 * wash can't happen and isn't refunded — so it leads, and it says the stakes.
 */
export function residentNextSteps(d: BookingCalendarDetails): string[] {
  return [
    `Drop your keys at the front desk before your wash window on ${washWindow(d)}.`,
    d.spotLabel
      ? `Leave your ${d.vehicleDesc ?? 'vehicle'} in spot ${d.spotLabel} so the crew can find it.`
      : `Leave your ${d.vehicleDesc ?? 'vehicle'} in your usual spot so the crew can find it.`,
    'If your keys are not at the front desk before the service, the operator cannot wash your vehicle and the booking is not refunded.',
    'We will email you when the wash is done — pick your keys up at the front desk.',
  ];
}

/** The resident's own calendar event: their appointment, and their to-do list. */
export function residentWashEvent(
  d: BookingCalendarDetails,
  attendee?: CalendarPerson,
): WashEvent {
  const steps = residentNextSteps(d);
  const header = `Car wash at ${d.buildingName ?? 'your building'}${
    d.operatorName ? ` by ${d.operatorName}` : ''
  }.`;
  return {
    uid: `${d.bookingId}@getlavo.io`,
    title: `Lavo wash · ${d.vehicleDesc ?? 'Vehicle'}`,
    description: [header, '', 'Before your appointment:', ...steps.map((s) => `- ${s}`)].join('\n'),
    location: d.location ?? undefined,
    date: d.scheduledFor,
    time: d.timeSlot,
    organizer: organizer(),
    attendee,
    sequence: d.sequence,
  };
}

/**
 * The operator's calendar event: the job. Same booking, but the description is
 * the crew's brief — whose car, which spot, which extras — rather than the
 * resident's key-drop reminder.
 */
export function operatorWashEvent(
  d: BookingCalendarDetails,
  attendee?: CalendarPerson,
): WashEvent {
  const lines = [
    `Wash for ${d.residentName || 'a resident'} at ${d.buildingName ?? 'the building'}.`,
    '',
    `Vehicle: ${d.vehicleDesc ?? 'see booking'}`,
    `Spot: ${d.spotLabel || 'not provided'}`,
    'Keys: front desk',
  ];
  if (d.addonLabels?.length) lines.push(`Add-ons: ${d.addonLabels.join(', ')}`);
  if (d.accessNotes) lines.push(`Resident notes: ${d.accessNotes}`);
  return {
    // Distinct from the resident's UID: same appointment, but two separate
    // invites. Sharing a UID makes a calendar treat the second as an update to
    // the first and overwrite whichever arrived earlier.
    uid: `${d.bookingId}-operator@getlavo.io`,
    title: `Lavo job · ${d.vehicleDesc ?? 'Vehicle'} · ${d.buildingName ?? 'Building'}`,
    description: lines.join('\n'),
    location: d.location ?? undefined,
    date: d.scheduledFor,
    time: d.timeSlot,
    organizer: organizer(),
    attendee,
    sequence: d.sequence,
  };
}

export function residentInviteIcs(d: BookingCalendarDetails, attendee?: CalendarPerson) {
  return buildIcs(residentWashEvent(d, attendee), { method: attendee ? 'REQUEST' : 'PUBLISH' });
}

export function operatorInviteIcs(d: BookingCalendarDetails, attendee?: CalendarPerson) {
  return buildIcs(operatorWashEvent(d, attendee), { method: attendee ? 'REQUEST' : 'PUBLISH' });
}
