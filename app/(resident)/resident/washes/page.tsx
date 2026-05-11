import { PageHeader } from '@/components/PortalShell';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { dateShort, money } from '@/lib/format';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { SkipButton } from './SkipButton';
import { RateWash } from './RateWash';
import { Complain } from './Complain';
import { PhotoThumb } from '@/components/PhotoLightbox';

export default async function ResidentWashes() {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  const sb = supabaseServer();

  const { data: resident } = await sb
    .from('residents')
    .select('id, building_id, spot_label, building:buildings(name, wash_day), vehicles(*)')
    .eq('profile_id', session.user.id)
    .maybeSingle();
  if (!resident) redirect('/resident/onboarding');

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: nextWashDay }, { data: history }, { data: skips }, { data: reviews }] = await Promise.all([
    sb.from('wash_days')
      .select('id, scheduled_for, operator:operators(name)')
      .eq('building_id', resident.building_id)
      .gte('scheduled_for', today)
      .order('scheduled_for')
      .limit(1)
      .maybeSingle(),
    sb.from('washes')
      .select('id, status, completed_at, photo_url, flag_reason, wash_day:wash_days(scheduled_for)')
      .eq('resident_id', resident.id)
      .order('completed_at', { ascending: false, nullsFirst: false })
      .limit(20),
    sb.from('wash_skips')
      .select('wash_day_id')
      .eq('resident_id', resident.id),
    sb.from('wash_reviews')
      .select('wash_id, rating')
      .eq('resident_id', resident.id),
  ]);

  const reviewMap = new Map((reviews ?? []).map((r: any) => [r.wash_id, r.rating]));

  const skipIds = new Set((skips ?? []).map((s) => s.wash_day_id));
  const nextSkipped = nextWashDay && skipIds.has(nextWashDay.id);
  const vehicle = (resident.vehicles as any[])?.[0];
  const building = resident.building as any;

  function daysUntil(d: string) {
    const days = Math.round((new Date(d).getTime() - Date.now()) / 86400000);
    if (days <= 0) return 'today';
    if (days === 1) return 'tomorrow';
    return `in ${days} days`;
  }

  return (
    <>
      <PageHeader eyebrow={building?.name} title="My washes" />

      {!history?.length && nextWashDay && (
        <div className="mb-6 card border-gleam/30 p-5 text-sm text-ink-200">
          You're registered. Your first wash is {dateShort(nextWashDay.scheduled_for)}.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <div className="text-xs uppercase tracking-widest text-gleam">Next wash</div>
          {nextWashDay ? (
            <>
              <div className="mt-2 font-display text-4xl">{dateShort(nextWashDay.scheduled_for)}</div>
              <div className="mt-1 text-sm text-ink-400">{daysUntil(nextWashDay.scheduled_for)}</div>
              <div className="mt-3 text-sm">
                <div>Spot: <span className="text-ink-100">{resident.spot_label || '—'}</span></div>
              </div>
              <div className="mt-5">
                {nextSkipped ? (
                  <SkipButton washDayId={nextWashDay.id} skipped={true} scheduledFor={nextWashDay.scheduled_for} />
                ) : (
                  <SkipButton washDayId={nextWashDay.id} skipped={false} scheduledFor={nextWashDay.scheduled_for} />
                )}
              </div>
            </>
          ) : (
            <div className="mt-2 text-sm text-ink-400">
              {building?.wash_day
                ? `Your next wash will be on a ${building.wash_day}.`
                : 'No upcoming wash day yet. Your building manager will schedule one soon.'}
            </div>
          )}
        </div>

        <div className="card p-6">
          <h3 className="font-display text-lg">Your setup</h3>
          {vehicle && (
            <div className="mt-2 text-sm text-ink-200">
              {vehicle.year} {vehicle.make} {vehicle.model} · {vehicle.color}{resident.spot_label ? ` · Spot ${resident.spot_label}` : ''}
            </div>
          )}
          <Link href="/resident/vehicle" className="mt-4 inline-block text-xs text-gleam">Edit →</Link>
        </div>
      </div>

      {!history?.length && (
        <div className="mt-8 card p-6">
          <h3 className="font-display text-lg">What to expect</h3>
          <ol className="mt-3 space-y-2 text-sm text-ink-300">
            <li>1. Leave your car in your spot.</li>
            <li>2. The crew works through the garage on wash day.</li>
            <li>3. You get a notification with a photo when it's done.</li>
          </ol>
        </div>
      )}

      {!!history?.length && (
        <div className="mt-8">
          <h2 className="font-display text-xl mb-3">Wash history</h2>
          <div className="space-y-3">
            {history.map((w: any) => (
              <div key={w.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm">{dateShort(w.wash_day?.scheduled_for ?? w.completed_at)}</div>
                    {w.flag_reason && <div className="mt-1 text-xs text-amber-300">⚑ {w.flag_reason}</div>}
                  </div>
                  <span className={`chip ${w.status === 'completed' ? 'text-gleam' : ''}`}>{w.status}</span>
                </div>
                {w.photo_url && (
                  <div className="mt-3">
                    <PhotoThumb src={w.photo_url} />
                  </div>
                )}
                {w.status === 'completed' && (
                  <>
                    <RateWash washId={w.id} alreadyRated={reviewMap.get(w.id) ?? null} />
                    <Complain washId={w.id} />
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
