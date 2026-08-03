import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * Single source of truth for bookable wash slots. Every surface that shows
 * availability (QR landing calendar, resident booking form, /schedule) reads
 * through here, so an operator updating their wash days — or a building
 * manager overriding them — propagates everywhere at once.
 *
 * Day filtering for the building's partnered operator:
 *  - Base: the wash days the operator selects (non-closed days in hours_json).
 *  - Override: if the property manager set a weekly day on the building
 *    (wash_day, else preferred_wash_day), that day replaces the operator's
 *    selection — the manager's preference wins even where it disagrees.
 *  - Specific wash_days rows (operator-proposed, manager-confirmed dates) are
 *    always bookable on top of either of the above.
 * Slot times always come from the operator's hours for that weekday. For a
 * non-partnered operator only their own hours/days apply.
 *
 * Within a day, an hour that already holds a booking is taken: the crew washes
 * one vehicle at a time, so a second resident can't be promised the same hour.
 * Taken hours are reported separately from open ones (`taken`) so the pickers
 * can show them greyed out rather than silently dropping them — a resident
 * seeing 1:00 PM disappear learns nothing; seeing it crossed out says why.
 */

const DOW_KEYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const DAYS_AHEAD = 14;

/** Vehicles one operator can take in the same hour. One crew, one car. */
const SLOT_CAPACITY = 1;

/**
 * The statuses that actually hold an operator's time. A booking only occupies
 * its day and its hour while it is live — cancelling one (or having it
 * refunded, or abandoning checkout, all of which land the row on `cancelled`)
 * hands the hour straight back, and the next resident to look sees it open
 * again. Nothing has to be released by hand, which is the point: the day the
 * cancel path forgets a clean-up step is the day an operator's calendar starts
 * holding hours nobody is coming for.
 */
export const SLOT_HOLDING_STATUSES = ['confirmed', 'in_progress'] as const;

type DayHours = { open?: string; close?: string; closed?: boolean };

export type AvailabilityDay = {
  date: string;
  dow: string;
  /** Hours still bookable, in order. */
  slots: string[];
  /** Hours the operator works that day but has already filled. */
  taken: string[];
  full: boolean;
};

function hourLabel(h: number): string {
  const period = h >= 12 ? 'PM' : 'AM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:00 ${period}`;
}

/**
 * Bookings store the slot as the label the picker showed ("1:00 PM"), but rows
 * predating that — or written by hand — can carry "13:00" or odd spacing.
 * Comparing on the hour rather than the string keeps those counting against
 * the slot they actually occupy.
 */
function slotKey(value: string | null | undefined): string | null {
  const raw = (value ?? '').trim();
  if (!raw) return null;
  const twelve = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(raw);
  if (twelve) {
    let h = parseInt(twelve[1], 10) % 12;
    if (twelve[3].toUpperCase() === 'PM') h += 12;
    return hourLabel(h);
  }
  const twentyFour = /^(\d{1,2}):(\d{2})$/.exec(raw);
  if (twentyFour) {
    const h = parseInt(twentyFour[1], 10);
    if (h >= 0 && h <= 23) return hourLabel(h);
  }
  return raw.toUpperCase().replace(/\s+/g, ' ');
}

function parseHour(value: string | undefined, fallback: number): number {
  const h = parseInt((value ?? '').split(':')[0] ?? '', 10);
  return Number.isFinite(h) && h >= 0 && h <= 24 ? h : fallback;
}

/** Matches 'Sat' to 'Sat'/'Saturday' etc., case-insensitively. */
function sameWeekday(a: string | null | undefined, b: string): boolean {
  if (!a) return false;
  return a.trim().slice(0, 3).toLowerCase() === b.slice(0, 3).toLowerCase();
}

export async function getBuildingAvailability(
  buildingId: string,
  operatorId?: string,
  /**
   * A booking that is being moved: it already holds a seat on its current day,
   * and counting that seat against the resident would leave a full day looking
   * closed to the very booking sitting on it.
   */
  opts: { excludeBookingId?: string } = {},
): Promise<AvailabilityDay[]> {
  const admin = supabaseAdmin();

  const [{ data: building }, { data: partnership }] = await Promise.all([
    admin.from('buildings').select('id, wash_day, preferred_wash_day').eq('id', buildingId).maybeSingle(),
    admin
      .from('partnerships')
      .select('operator:operators(id, capacity_per_day, hours_json)')
      .eq('building_id', buildingId)
      .eq('status', 'active')
      .maybeSingle(),
  ]);
  if (!building) return [];

  const partnerOperator = (partnership?.operator as any) ?? null;
  let operator = partnerOperator;
  const isPartnerOperator = !operatorId || operatorId === partnerOperator?.id;

  if (operatorId && !isPartnerOperator) {
    const { data: op } = await admin
      .from('operators')
      .select('id, capacity_per_day, hours_json')
      .eq('id', operatorId)
      .maybeSingle();
    operator = op ?? null;
  }
  if (!operator) return [];

  const start = new Date();
  start.setDate(start.getDate() + 1); // bookings open from tomorrow
  const dates: string[] = [];
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  const from = dates[0];
  const to = dates[dates.length - 1];

  const [{ data: booked }, { data: agreedRows }] = await Promise.all([
    (() => {
      const q = admin
        .from('bookings')
        .select('scheduled_for, time_slot')
        .eq('operator_id', operator.id)
        .in('status', SLOT_HOLDING_STATUSES as unknown as string[])
        .gte('scheduled_for', from)
        .lte('scheduled_for', to);
      return opts.excludeBookingId ? q.neq('id', opts.excludeBookingId) : q;
    })(),
    isPartnerOperator
      ? admin
          .from('wash_days')
          .select('scheduled_for, confirmation')
          .eq('building_id', buildingId)
          .in('confirmation', ['auto', 'confirmed'])
          .gte('scheduled_for', from)
          .lte('scheduled_for', to)
      : Promise.resolve({ data: [] as { scheduled_for: string }[] }),
  ]);

  const agreedDates = new Set((agreedRows ?? []).map((r: any) => r.scheduled_for as string));

  return buildAvailabilityDays({
    dates,
    bookings: (booked ?? []) as BookingRow[],
    agreedDates,
    managerDay: building.wash_day ?? building.preferred_wash_day ?? null,
    hours: (operator.hours_json ?? {}) as Record<string, DayHours>,
    capacity: operator.capacity_per_day ?? 20,
    isPartnerOperator,
  });
}

export type BookingRow = { scheduled_for: string; time_slot?: string | null };

/**
 * The day-by-day shape of availability, given everything already read from the
 * database. Pure, so the rules that decide what a resident may book — which
 * days are served, which hours are still free — are testable without a
 * database (see scripts/slot-availability-test.ts).
 */
export function buildAvailabilityDays({
  dates,
  bookings,
  agreedDates,
  managerDay,
  hours,
  capacity,
  isPartnerOperator,
}: {
  dates: string[];
  bookings: BookingRow[];
  agreedDates: Set<string>;
  managerDay: string | null;
  hours: Record<string, DayHours>;
  capacity: number;
  isPartnerOperator: boolean;
}): AvailabilityDay[] {
  const bookedPerDay = new Map<string, number>();
  // date → slot label → how many vehicles are already on that hour.
  const bookedPerSlot = new Map<string, Map<string, number>>();
  for (const b of bookings) {
    bookedPerDay.set(b.scheduled_for, (bookedPerDay.get(b.scheduled_for) ?? 0) + 1);
    const slot = slotKey(b.time_slot);
    // A booking with no time only holds a seat in the day, not in an hour.
    if (!slot) continue;
    const forDay = bookedPerSlot.get(b.scheduled_for) ?? new Map<string, number>();
    forDay.set(slot, (forDay.get(slot) ?? 0) + 1);
    bookedPerSlot.set(b.scheduled_for, forDay);
  }

  return dates.map((date) => {
    const dow = DOW_KEYS[new Date(`${date}T12:00:00Z`).getUTCDay()];
    const dayHours = hours[dow];
    const operatorDay = dayHours?.closed !== true;
    const open = parseHour(dayHours?.open, 8);
    const close = parseHour(dayHours?.close, 17);
    const atDayCapacity = (bookedPerDay.get(date) ?? 0) >= capacity;

    const bookable = isPartnerOperator
      ? agreedDates.has(date) || (managerDay ? sameWeekday(managerDay, dow) : operatorDay)
      : operatorDay;

    const slots: string[] = [];
    const taken: string[] = [];
    if (bookable && !atDayCapacity) {
      const onSlot = bookedPerSlot.get(date);
      for (let h = open; h < close; h++) {
        const label = hourLabel(h);
        if ((onSlot?.get(label) ?? 0) >= SLOT_CAPACITY) taken.push(label);
        else slots.push(label);
      }
    }

    // A day whose every working hour is spoken for is full to a resident, even
    // when the day-level capacity still has room.
    const full = atDayCapacity || (bookable && slots.length === 0 && taken.length > 0);

    return { date, dow, slots, taken, full };
  });
}
