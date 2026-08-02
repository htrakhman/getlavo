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
    .eq('scheduled_for', tomorrow)
    .in('confirmation', ['auto', 'confirmed']);

  let sent = 0;
  for (const d of days ?? []) {
    // Two audiences, because either one alone misses real people:
    //   - the roster for tomorrow (washes rows), which is what the crew will
    //     actually work through. A one-off booking creates a roster row and no
    //     subscription, so filtering on is_subscribed skipped every one of them
    //     — this job reported "sent: 0" on every run for months.
    //   - subscribed residents, who are on the recurring plan and may not have
    //     an explicit booking for the day.
    const { data: roster } = await sb
      .from('washes')
      .select('resident_id')
      .eq('wash_day_id', d.id)
      .in('status', ['scheduled', 'in_progress']);

    const { data: subscribed } = await sb
      .from('residents')
      .select('id')
      .eq('building_id', d.building_id)
      .eq('is_subscribed', true)
      .eq('active', true);

    const residentIds = new Set<string>();
    for (const w of roster ?? []) if (w.resident_id) residentIds.add(w.resident_id);
    for (const r of subscribed ?? []) residentIds.add(r.id);
    if (!residentIds.size) continue;

    const { data: skips } = await sb
      .from('wash_skips')
      .select('resident_id')
      .eq('wash_day_id', d.id);
    for (const s of skips ?? []) residentIds.delete(s.resident_id);
    if (!residentIds.size) continue;

    // One email per resident even when they booked twice for the same day.
    const { data: residents } = await sb
      .from('residents')
      .select('id, profile_id')
      .in('id', [...residentIds]);

    for (const r of residents ?? []) {
      if (!r.profile_id) continue;
      await notify(r.profile_id, 'wash_reminder', {
        buildingName: (d.building as any)?.name,
        link: '/resident/bookings',
        cta: 'View your wash',
      });
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
