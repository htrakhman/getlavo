import { PageHeader } from '@/components/PortalShell';
import { getSessionUser } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
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
  const sbAdmin = supabaseAdmin();

  // Use admin client to bypass RLS — supabaseServer() with complex joins (buildings + vehicles)
  // silently returns null when auth.uid() is not set in the PostgREST context (same bug as #41).
  // Identity is still scoped to the authenticated user via the explicit profile_id filter.
  const { data: resident, error: residentErr } = await sbAdmin
    .from('residents')
    .select('id, building_id, spot_label, building:buildings(name, wash_day), vehicles(*)')
    .eq('profile_id', session.user.id)
    .maybeSingle();
  if (residentErr) {
    console.error('[washes] resident query error:', residentErr.message, residentErr.details);
  }
  console.log('[washes] profileId:', session.user.id, 'resident:', resident?.id ?? 'null');
  if (!resident) redirect('/resident/onboarding');

  const today = new Date().toISOString().slice(0, 10);

  // Admin client for the same RLS reason as above; every query is still scoped
  // to this resident via building_id / resident.id from the row fetched above.
  const [{ data: nextWashDay }, { data: nextBooking }, { data: history }, { data: skips }, { data: reviews }, { data: partnership }] = await Promise.all([
    sbAdmin.from('wash_days')
      .select('id, scheduled_for, operator:operators(name)')
      .eq('building_id', resident.building_id)
      .gte('scheduled_for', today)
      .order('scheduled_for')
      .limit(1)
      .maybeSingle(),
    sbAdmin.from('bookings')
      .select('id, scheduled_for, time_slot, status')
      .eq('resident_id', resident.id)
      .gte('scheduled_for', today)
      .in('status', ['confirmed', 'in_progress', 'pending_payment'])
      .order('scheduled_for')
      .limit(1)
      .maybeSingle(),
    sbAdmin.from('washes')
      .select('id, status, completed_at, photo_url, flag_reason, wash_day:wash_days(scheduled_for)')
      .eq('resident_id', resident.id)
      .order('completed_at', { ascending: false, nullsFirst: false })
      .limit(20),
    sbAdmin.from('wash_skips')
      .select('wash_day_id')
      .eq('resident_id', resident.id),
    sbAdmin.from('wash_reviews')
      .select('wash_id, rating')
      .eq('resident_id', resident.id),
    // Same "is there really an operator serving this building?" check that
    // /resident/book uses, so the two pages can't disagree about coverage.
    sbAdmin.from('partnerships')
      .select('operator:operators(status, stripe_onboarding_complete)')
      .eq('building_id', resident.building_id)
      .eq('status', 'active')
      .maybeSingle(),
  ]);

  const partnerOp = (partnership?.operator as any) ?? null;
  const hasActiveOperator = partnerOp?.status === 'approved' && !!partnerOp?.stripe_onboarding_complete;

  const reviewMap = new Map((reviews ?? []).map((r: any) => [r.wash_id, r.rating]));

  const skipIds = new Set((skips ?? []).map((s) => s.wash_day_id));
  const nextSkipped = nextWashDay && skipIds.has(nextWashDay.id);
  // A wash the resident booked themselves takes priority over the building-wide
  // schedule when it comes first (or on the same day, since it has a time slot).
  const bookingIsNext =
    !!nextBooking && (!nextWashDay || nextBooking.scheduled_for <= nextWashDay.scheduled_for);
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
      <PageHeader eyebrow={building?.name} title="My account" />

      {!history?.length && (bookingIsNext || nextWashDay) && (
        <div className="mb-6 card border-gleam/30 p-5 text-sm text-ink-200">
          You're registered. Your first wash is {dateShort(bookingIsNext ? nextBooking!.scheduled_for : nextWashDay!.scheduled_for)}.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <div className="text-xs uppercase tracking-widest text-gleam">Next wash</div>
          {bookingIsNext ? (
            <>
              <div className="mt-2 font-display text-4xl">{dateShort(nextBooking!.scheduled_for)}</div>
              <div className="mt-1 text-sm text-ink-400">{daysUntil(nextBooking!.scheduled_for)}</div>
              <div className="mt-3 text-sm">
                {nextBooking!.time_slot && <div>Time: <span className="text-ink-100">{nextBooking!.time_slot}</span></div>}
                <div>Spot: <span className="text-ink-100">{resident.spot_label || '—'}</span></div>
                {nextBooking!.status === 'pending_payment' && (
                  <div className="mt-1 text-amber-600">Pending payment</div>
                )}
              </div>
              <Link href="/resident/bookings" className="mt-5 inline-block text-xs text-gleam">Manage booking →</Link>
            </>
          ) : nextWashDay ? (
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
              {hasActiveOperator && building?.wash_day
                ? `Your next wash will be on a ${building.wash_day}.`
                : 'We’re lining up an operator for your building — you’ll be notified once wash days are scheduled.'}
            </div>
          )}
        </div>

        <div className="card p-6">
          <h3 className="font-display text-lg">Your vehicle</h3>
          {vehicle && (
            <div className="mt-2 text-sm text-ink-200">
              {vehicle.year} {vehicle.make} {vehicle.model} · {vehicle.color}{resident.spot_label ? ` · Spot ${resident.spot_label}` : ''}
            </div>
          )}
          <div className="mt-4 flex gap-4">
            <Link href="/resident/vehicle" className="text-xs text-gleam">Edit →</Link>
            <Link href="/resident/account" className="text-xs text-gleam">Profile &amp; notifications →</Link>
          </div>
        </div>
      </div>

      {!history?.length && (
        <div className="mt-8 card p-6">
          <h3 className="font-display text-lg">What to expect</h3>
          <ol className="mt-3 space-y-2 text-sm text-ink-300">
            <li>1. Leave your car in your spot.</li>
            <li>2. The crew will get to your vehicle based on your designated time slot. Please allow anywhere from 1–3 hours for your vehicle to get done.</li>
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
                    {w.flag_reason && <div className="mt-1 text-xs text-amber-600">⚑ {w.flag_reason}</div>}
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
