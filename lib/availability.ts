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
 */

const DOW_KEYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const DAYS_AHEAD = 14;

type DayHours = { open?: string; close?: string; closed?: boolean };

export type AvailabilityDay = { date: string; dow: string; slots: string[]; full: boolean };

function hourLabel(h: number): string {
  const period = h >= 12 ? 'PM' : 'AM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:00 ${period}`;
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
  operatorId?: string
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
    admin
      .from('bookings')
      .select('scheduled_for')
      .eq('operator_id', operator.id)
      .in('status', ['confirmed', 'in_progress'])
      .gte('scheduled_for', from)
      .lte('scheduled_for', to),
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

  const bookedPerDay = new Map<string, number>();
  for (const b of booked ?? []) {
    bookedPerDay.set(b.scheduled_for, (bookedPerDay.get(b.scheduled_for) ?? 0) + 1);
  }

  const agreedDates = new Set((agreedRows ?? []).map((r: any) => r.scheduled_for as string));
  const managerDay = building.wash_day ?? building.preferred_wash_day ?? null;

  const hours = (operator.hours_json ?? {}) as Record<string, DayHours>;
  const capacity = operator.capacity_per_day ?? 20;

  return dates.map((date) => {
    const dow = DOW_KEYS[new Date(`${date}T12:00:00Z`).getUTCDay()];
    const dayHours = hours[dow];
    const operatorDay = dayHours?.closed !== true;
    const open = parseHour(dayHours?.open, 8);
    const close = parseHour(dayHours?.close, 17);
    const full = (bookedPerDay.get(date) ?? 0) >= capacity;

    const bookable = isPartnerOperator
      ? agreedDates.has(date) || (managerDay ? sameWeekday(managerDay, dow) : operatorDay)
      : operatorDay;

    const slots: string[] = [];
    if (bookable && !full) {
      for (let h = open; h < close; h++) slots.push(hourLabel(h));
    }

    return { date, dow, slots, full };
  });
}
