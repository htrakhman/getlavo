import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * Single source of truth for bookable wash slots. Every surface that shows
 * availability (QR landing calendar, resident booking form, /schedule) reads
 * through here, so an operator updating their hours — or a building manager
 * and operator agreeing on wash days — propagates everywhere at once.
 *
 * Day filtering, in priority order:
 *  1. Confirmed wash_days rows for the building (specific agreed dates).
 *  2. The building's weekly wash_day / preferred_wash_day (recurring weekday).
 *  3. No agreement recorded yet → operator's general hours only.
 * The agreed-day constraint applies only to the building's partnered operator.
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
  const weeklyDay = building.wash_day ?? building.preferred_wash_day ?? null;
  // Only constrain to agreed days when an agreement actually exists.
  const hasAgreement = isPartnerOperator && (agreedDates.size > 0 || !!weeklyDay);

  const hours = (operator.hours_json ?? {}) as Record<string, DayHours>;
  const capacity = operator.capacity_per_day ?? 20;

  return dates.map((date) => {
    const dow = DOW_KEYS[new Date(`${date}T12:00:00Z`).getUTCDay()];
    const dayHours = hours[dow];
    const closed = dayHours?.closed === true;
    const open = parseHour(dayHours?.open, 8);
    const close = parseHour(dayHours?.close, 17);
    const full = (bookedPerDay.get(date) ?? 0) >= capacity;
    const agreed = !hasAgreement || agreedDates.has(date) || sameWeekday(weeklyDay, dow);

    const slots: string[] = [];
    if (!closed && !full && agreed) {
      for (let h = open; h < close; h++) slots.push(hourLabel(h));
    }

    return { date, dow, slots, full };
  });
}
