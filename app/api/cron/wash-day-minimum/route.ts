import { NextResponse } from 'next/server';
import { sweepWashDayMinimums } from '@/lib/wash-day-minimum-sweep';
import { logJobRun, logError } from '@/lib/error-log';

export const dynamic = 'force-dynamic';

/**
 * Manual / external entry point for the wash-day minimum sweep.
 *
 * Deliberately NOT registered in vercel.json: that file is capped at two cron
 * entries on the current plan and they must be daily. The sweep runs from the
 * daily wash-day reminder cron instead. This endpoint stays so the sweep can
 * be triggered by hand, or wired to an external scheduler if the plan ever
 * allows a finer cadence than once a day.
 */
export async function POST(req: Request) {
  const start = Date.now();

  const auth = req.headers.get('authorization');
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const { checked, cancelled, bookingsRefunded } = await sweepWashDayMinimums();

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
