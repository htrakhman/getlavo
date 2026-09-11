// The wash-day minimum sweep, as a plain function.
//
// This lives outside the route handler because it runs from two places: its
// own endpoint (/api/cron/wash-day-minimum, for a manual run or an external
// scheduler) and the daily wash-day reminder cron, which calls it first so a
// day that is about to be cancelled never generates "your wash is tomorrow"
// emails.
//
// It is not on its own Vercel cron schedule. vercel.json is capped at two
// cron entries on the current plan, and those entries must be daily — adding
// a third, hourly one failed every deployment for a day without failing a
// single local build, because `next build` does not validate vercel.json
// against plan limits. Folding the sweep into an existing daily job keeps the
// behaviour without spending a cron slot.
import { supabaseAdmin } from '@/lib/supabase/admin';
import { decideWashDay, MINIMUM_CUTOFF_HOURS } from '@/lib/wash-day-minimum';
import { cancelWashDayForMinimum } from '@/lib/wash-day-cancel';

export type MinimumSweepResult = {
  checked: number;
  cancelled: number;
  bookingsRefunded: number;
};

/**
 * Cancel every upcoming wash day that will not reach its operator's minimum.
 *
 * Scans a window wide enough to cover the cutoff plus a day of slack, so a day
 * whose cutoff passed between runs is still caught rather than silently
 * served. Days outside that window are left alone — a booking made weeks ahead
 * is never judged early.
 */
export async function sweepWashDayMinimums(now = new Date()): Promise<MinimumSweepResult> {
  const admin = supabaseAdmin();
  const today = now.toISOString().slice(0, 10);
  const horizon = new Date(now.getTime() + (MINIMUM_CUTOFF_HOURS + 24) * 3600_000)
    .toISOString()
    .slice(0, 10);

  const { data: washDays, error } = await admin
    .from('wash_days')
    .select('id, scheduled_for, operator_id, building_id')
    .is('cancelled_at', null)
    .is('completed_at', null)
    .gte('scheduled_for', today)
    .lte('scheduled_for', horizon);
  if (error) throw new Error(`wash_days query: ${error.message}`);

  const operatorIds = Array.from(
    new Set((washDays ?? []).map((w) => w.operator_id).filter(Boolean) as string[]),
  );
  const minimums = new Map<string, number>();
  if (operatorIds.length) {
    const { data: operators } = await admin
      .from('operators')
      .select('id, min_bookings_per_day')
      .in('id', operatorIds);
    for (const op of operators ?? []) {
      minimums.set(op.id, op.min_bookings_per_day ?? 0);
    }
  }

  const result: MinimumSweepResult = { checked: 0, cancelled: 0, bookingsRefunded: 0 };

  for (const washDay of washDays ?? []) {
    const minimum = washDay.operator_id ? minimums.get(washDay.operator_id) ?? 0 : 0;
    if (minimum <= 0) continue;

    // Cancelled bookings are not cars in the garage, so they cannot count
    // toward a day earning its trip.
    const { count } = await admin
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('wash_day_id', washDay.id)
      .in('status', ['pending_payment', 'confirmed', 'in_progress', 'completed']);

    result.checked += 1;
    const decision = decideWashDay({
      scheduledFor: washDay.scheduled_for,
      booked: count ?? 0,
      minimum,
      now,
    });
    if (decision.verdict !== 'cancel') continue;

    const outcome = await cancelWashDayForMinimum(
      washDay.id,
      `Fewer than ${decision.required} bookings by the ${MINIMUM_CUTOFF_HOURS}-hour cutoff (${decision.booked} booked).`,
    );
    if (outcome.cancelled) {
      result.cancelled += 1;
      result.bookingsRefunded += outcome.refunded;
    }
  }

  return result;
}
