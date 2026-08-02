/**
 * Regression guard for booking calendar invites.
 * Run: npx tsx --tsconfig tsconfig.scripts.json scripts/booking-invite-test.ts
 *
 * Three things this exists to prevent:
 *  1. A METHOD:REQUEST with no ORGANIZER/ATTENDEE. Gmail and Google Calendar
 *     only render an actionable invite when both are named; without them the
 *     booking "invite" silently degrades to a file the resident has to open.
 *  2. The resident's key-drop instructions leaking into the operator's event.
 *     Both sides used to receive the identical ICS, so the operator's calendar
 *     told them to leave their keys at the front desk.
 *  3. A late slot rolling the end time past midnight and emitting hour "24",
 *     which is not a valid ICS timestamp and breaks the whole event.
 */

import { buildIcs } from '../lib/ics';
import { operatorWashEvent, residentNextSteps, residentWashEvent } from '../lib/booking-calendar';

let failures = 0;
function check(name: string, cond: boolean) {
  if (!cond) {
    console.error(`FAIL: ${name}`);
    failures++;
  }
}

const DETAILS = {
  bookingId: 'b1',
  scheduledFor: '2026-08-14',
  timeSlot: '9:00 AM',
  buildingName: 'The Hudson',
  operatorName: 'Shine Co',
  residentName: 'Dana Reyes',
  vehicleDesc: 'blue Honda Civic',
  location: '1 River Rd, Edgewater, NJ',
  spotLabel: 'B-12',
  accessNotes: 'Gate code 4432',
  addonLabels: ['Interior vacuum'],
};

function main() {
  const resident = { email: 'dana@example.com', name: 'Dana Reyes' };
  const owner = { email: 'ops@shine.example', name: 'Shine Co' };

  const rIcs = buildIcs(residentWashEvent(DETAILS, resident), { method: 'REQUEST' });
  const oIcs = buildIcs(operatorWashEvent(DETAILS, owner), { method: 'REQUEST' });

  // ── a REQUEST has to name both ends, or it is not an invite ─────────────
  for (const [who, ics, email] of [
    ['resident', rIcs, resident.email],
    ['operator', oIcs, owner.email],
  ] as const) {
    check(`${who} invite declares an organizer`, /^ORGANIZER[;:]/m.test(ics));
    check(`${who} invite is addressed to the recipient`, ics.includes(`ATTENDEE`) && ics.includes(`mailto:${email}`));
    check(`${who} invite asks for an RSVP`, ics.includes('RSVP=TRUE'));
    check(`${who} invite is a REQUEST`, ics.includes('METHOD:REQUEST'));
  }

  // ── the two sides get different briefs ──────────────────────────────────
  check('resident invite carries the key drop-off', /front desk/i.test(rIcs));
  check(
    'resident invite states the no-refund consequence',
    residentNextSteps(DETAILS).some((s) => /not refunded/i.test(s)),
  );
  check(
    'operator invite does not tell the operator to drop keys off',
    !/Drop your keys/i.test(oIcs),
  );
  check('operator invite names the resident', oIcs.includes('Dana Reyes'));
  check('operator invite names the spot', oIcs.includes('B-12'));
  check('operator invite lists paid add-ons', oIcs.includes('Interior vacuum'));
  check('operator invite carries resident access notes', oIcs.includes('Gate code 4432'));

  // Two invites for one booking must not share a UID, or each calendar treats
  // the second as an update to the first.
  const uid = (s: string) => /^UID:(.+)$/m.exec(s)?.[1]?.trim();
  check('the two invites use distinct UIDs', !!uid(rIcs) && uid(rIcs) !== uid(oIcs));

  // ── timestamps stay valid ───────────────────────────────────────────────
  check('a timed slot produces a timed event', /DTSTART;TZID=America\/New_York:20260814T090000/.test(rIcs));
  check('a one-hour wash ends at 10:00', /DTEND;TZID=America\/New_York:20260814T100000/.test(rIcs));

  const late = buildIcs(residentWashEvent({ ...DETAILS, timeSlot: '11:30 PM' }, resident), {
    method: 'REQUEST',
  });
  const end = /DTEND;TZID=America\/New_York:\d{8}T(\d{2})(\d{2})/.exec(late);
  check('a late slot never emits an hour past 23', !!end && parseInt(end[1], 10) <= 23);

  const allDay = buildIcs(residentWashEvent({ ...DETAILS, timeSlot: null }, resident), {
    method: 'REQUEST',
  });
  check('a booking with no time slot stays all-day', allDay.includes('DTSTART;VALUE=DATE:20260814'));

  // ── a rescheduled booking replaces the invite already sent ──────────────
  const moved = buildIcs(
    residentWashEvent({ ...DETAILS, scheduledFor: '2026-08-21', sequence: 1 }, resident),
    { method: 'REQUEST' },
  );
  check('a fresh invite starts at sequence 0', /^SEQUENCE:0$/m.test(rIcs));
  check('a rescheduled invite bumps the sequence', /^SEQUENCE:1$/m.test(moved));
  check('a rescheduled invite keeps the original UID', uid(moved) === uid(rIcs));
  check('a rescheduled invite carries the new date', moved.includes('20260821T090000'));

  // ── escaping ────────────────────────────────────────────────────────────
  const commas = buildIcs(
    residentWashEvent({ ...DETAILS, buildingName: 'Smith, Jones & Co; Tower' }, resident),
    { method: 'REQUEST' },
  );
  check('commas in text values are escaped', commas.includes('Smith\\, Jones'));
  check('semicolons in text values are escaped', commas.includes('Co\\; Tower'));
  const quoted = buildIcs(residentWashEvent(DETAILS, { email: 'x@y.z', name: 'Reyes, Dana' }), {
    method: 'REQUEST',
  });
  check(
    'a comma in an attendee name cannot break the parameter list',
    /^ATTENDEE;CN=Reyes Dana;/m.test(quoted),
  );

  if (failures) {
    console.error(`\n${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log('booking invite checks passed');
}

main();
