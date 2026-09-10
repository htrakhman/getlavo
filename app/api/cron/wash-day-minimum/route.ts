import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { decideWashDay, MINIMUM_CUTOFF_HOURS } from '@/lib/wash-day-minimum';
import { cancelWashDayForMinimum } from '@/lib/wash-day-cancel';
import { logJobRun, logError } from '@/lib/error-log';

export const dynamic = 'force-dynamic';

/**
 * Hourly sweep: cancel wash days that will not reach their operator's minimum.
 *
 * Runs hourly rather than daily because the cutoff is an hour of the day, not a
 * date — a daily pass would let a day sit past its cutoff for up to 24 hours,
 * long enough for the operator to have already set out.
 *
 * Only days inside the cutoff window are considered, so a booking made weeks
 * ahead is never judged early.
 */
export async function POST(req: Request) {
  const start = Date.now();

  const auth = req.headers.get('authorization');
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const admin = supabaseAdmin();
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    // Everything that could be inside the cutoff window, plus a day of slack so
    // a day whose cutoff passed while the job was down is still caught.
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

    let checked = 0;
    let cancelled = 0;
    let bookingsRefunded = 0;

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

      checked += 1;
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
        cancelled += 1;
        bookingsRefunded += outcome.refunded;
      }
    }

    await logJobRun({
      jobName: 'wash-day-minimum',
      status: 'ok',
      durationMs: Date.now() - start,
      detail: { checked, cancelled, bookingsRefunded },
    });

    return NextResponse.json({ ok: true, checked, cancelled, bookingsRefunded });
  } catch (e: any) {
    const message = e instanceof Error ? e.message : String(e);
    void logError({ source: 'cron.wash-day-minimum', message });
    await logJobRun({
      jobName: 'wash-day-minimum',
      status: 'error',
      durationMs: Date.now() - start,
      detail: { message },
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
