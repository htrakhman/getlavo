import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { notify } from '@/lib/notify';
import { logJobRun, logError } from '@/lib/error-log';

export async function POST(req: Request) {
  const start = Date.now();

  // Optional shared-secret guard
  const auth = req.headers.get('authorization');
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {

  const sb = supabaseAdmin();
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const { data: days } = await sb
    .from('wash_days')
    .select('id, building_id, building:buildings(name)')
    .eq('scheduled_for', tomorrow);

  let sent = 0;
  for (const d of days ?? []) {
    const { data: residents } = await sb
      .from('residents')
      .select('id, profile_id')
      .eq('building_id', d.building_id)
      .eq('is_subscribed', true);

    const { data: skips } = await sb
      .from('wash_skips')
      .select('resident_id')
      .eq('wash_day_id', d.id);
    const skippedIds = new Set((skips ?? []).map((s) => s.resident_id));

    for (const r of residents ?? []) {
      if (skippedIds.has(r.id)) continue;
      await notify(r.profile_id, 'wash_reminder', { buildingName: (d.building as any)?.name });
      sent++;
    }
  }

    await logJobRun({ jobName: 'wash_day_reminder', status: 'ok', durationMs: Date.now() - start, detail: { sent } });
    return NextResponse.json({ sent });
  } catch (e: any) {
    await logError({ source: 'wash_day_reminder', message: e?.message ?? 'unknown', stack: e?.stack });
    await logJobRun({ jobName: 'wash_day_reminder', status: 'error', durationMs: Date.now() - start });
    return NextResponse.json({ error: 'job failed' }, { status: 500 });
  }
}

// Allow GET for Vercel cron compatibility
export const GET = POST;
