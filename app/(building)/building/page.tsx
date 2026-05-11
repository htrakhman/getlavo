import { PageHeader } from '@/components/PortalShell';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { dateShort } from '@/lib/format';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CopyResidentLink } from './CopyResidentLink';
import { getCurrentBuildingForSession } from '@/lib/building';

export default async function BuildingDashboard() {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  const { current: building } = await getCurrentBuildingForSession(session.user.id);
  if (!building) redirect('/building/onboarding');
  const sb = supabaseServer();

  const today = new Date().toISOString().slice(0, 10);
  const thisMonthStart = today.slice(0, 8) + '01';

  const [
    { data: partnership },
    { count: residentCount },
    { count: monthWashCount },
    { data: upcoming },
  ] = await Promise.all([
    sb.from('partnerships')
      .select('id, operator:operators(id, name, slug, rating_avg, rating_count)')
      .eq('building_id', building.id)
      .eq('status', 'active')
      .maybeSingle(),
    sb.from('residents')
      .select('*', { count: 'exact', head: true })
      .eq('building_id', building.id)
      .eq('active', true),
    sb.from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('building_id', building.id)
      .in('status', ['confirmed', 'completed', 'in_progress'])
      .gte('scheduled_for', thisMonthStart),
    sb.from('wash_days')
      .select('id, scheduled_for, operator:operators(name)')
      .eq('building_id', building.id)
      .gte('scheduled_for', today)
      .order('scheduled_for')
      .limit(5),
  ]);

  const operator = (partnership?.operator as any) ?? null;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const buildingUrl = building.slug ? `${appUrl}/b/${building.slug}` : null;

  return (
    <>
      <PageHeader
        eyebrow={building.name}
        title="Building overview"
        action={buildingUrl ? <CopyResidentLink url={buildingUrl} /> : null}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="stat">
          <div className="text-xs uppercase tracking-widest text-ink-300">Residents signed up</div>
          <div className="mt-2 font-display text-4xl">{residentCount ?? 0}</div>
        </div>
        <div className="stat">
          <div className="text-xs uppercase tracking-widest text-ink-300">Washes this month</div>
          <div className="mt-2 font-display text-4xl">{monthWashCount ?? 0}</div>
        </div>
        <div className="stat">
          <div className="text-xs uppercase tracking-widest text-ink-300">Car wash partner</div>
          <div className="mt-2 font-display text-2xl">{operator?.name ?? '—'}</div>
          {operator?.rating_count > 0 && (
            <div className="mt-1 text-xs text-ink-400">★ {Number(operator.rating_avg).toFixed(1)}</div>
          )}
          {!operator && (
            <div className="mt-1 text-xs text-ink-400">No partner yet</div>
          )}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {buildingUrl && (
          <div className="card p-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-xl">Resident link</h3>
              <Link href="/building/share" className="text-xs text-gleam">QR code →</Link>
            </div>
            <div className="rounded-xl bg-ink-800/50 px-4 py-3 font-mono text-sm text-ink-200 truncate">
              {buildingUrl}
            </div>
            <p className="mt-3 text-xs text-ink-400">
              Share this link (or the QR code) with residents to let them sign up and book washes.
            </p>
          </div>
        )}

        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-xl">Upcoming wash days</h3>
            <Link href="/building/wash-days" className="text-xs text-gleam">All →</Link>
          </div>
          {upcoming?.length ? (
            <ul className="divide-y divide-white/5">
              {upcoming.map((wd: any) => (
                <li key={wd.id} className="flex items-center justify-between py-3">
                  <span className="text-ink-100">{dateShort(wd.scheduled_for)}</span>
                  <span className="chip">scheduled</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-400">
              {operator
                ? 'Your first wash day will be scheduled by Lavo.'
                : 'Wash days will appear here once your car wash crew is confirmed.'}
            </p>
          )}
        </div>

        <div className="card p-6 lg:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-xl mb-2">Monthly summary</h3>
              <p className="text-ink-300 text-sm">
                {monthWashCount ?? 0} wash{(monthWashCount ?? 0) !== 1 ? 'es' : ''} booked this month
                {operator ? ` with ${operator.name}` : ''}
                {residentCount ? ` · ${residentCount} resident${residentCount !== 1 ? 's' : ''} enrolled` : ''}.
              </p>
              <p className="mt-1 text-xs text-ink-500">Share this stat with building leadership to show the amenity is being used.</p>
            </div>
            <a
              href={`/api/building/report?buildingId=${building.id}&month=${today.slice(0, 7)}`}
              className="btn-quiet shrink-0 text-sm"
              download
            >
              Download CSV
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
