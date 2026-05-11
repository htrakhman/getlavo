import { PageHeader } from '@/components/PortalShell';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getCurrentBuildingForSession } from '@/lib/building';
import { dateShort } from '@/lib/format';
import Link from 'next/link';

export default async function BuildingWashDaysPage() {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  const { current: building } = await getCurrentBuildingForSession(session.user.id);
  if (!building) redirect('/building/onboarding');

  const sb = supabaseServer();
  const { data: days } = await sb
    .from('wash_days')
    .select('id, scheduled_for, started_at, completed_at, operator:operators(name)')
    .eq('building_id', building.id)
    .order('scheduled_for', { ascending: false })
    .limit(50);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = (days ?? []).filter((d: any) => !d.completed_at && d.scheduled_for >= today);
  const past = (days ?? []).filter((d: any) => d.completed_at || d.scheduled_for < today);

  return (
    <>
      <PageHeader eyebrow={building.name} title="Wash days" />

      {upcoming.length > 0 && (
        <>
          <h2 className="text-xs uppercase tracking-widest text-ink-400 mb-3">Upcoming &amp; live</h2>
          <div className="card divide-y divide-white/5 mb-8">
            {upcoming.map((wd: any) => (
              <Link
                key={wd.id}
                href={`/building/wash-days/${wd.id}`}
                className="flex items-center justify-between p-5 hover:bg-white/5"
              >
                <div>
                  <div className="font-medium">{dateShort(wd.scheduled_for)}</div>
                  <div className="text-xs text-ink-400">{wd.operator?.name ?? 'Operator TBD'}</div>
                </div>
                <span className="chip">
                  {wd.started_at ? 'in progress' : 'scheduled'}
                </span>
              </Link>
            ))}
          </div>
        </>
      )}

      {past.length > 0 && (
        <>
          <h2 className="text-xs uppercase tracking-widest text-ink-400 mb-3">Past</h2>
          <div className="card divide-y divide-white/5">
            {past.map((wd: any) => (
              <Link
                key={wd.id}
                href={`/building/wash-days/${wd.id}`}
                className="flex items-center justify-between p-5 hover:bg-white/5"
              >
                <div>
                  <div className="font-medium">{dateShort(wd.scheduled_for)}</div>
                  <div className="text-xs text-ink-400">{wd.operator?.name ?? '—'}</div>
                </div>
                <span className="chip">{wd.completed_at ? 'completed' : 'missed'}</span>
              </Link>
            ))}
          </div>
        </>
      )}

      {!days?.length && (
        <div className="card p-10 text-center text-ink-400">
          No wash days scheduled yet. They'll appear here once your operator is assigned.
        </div>
      )}
    </>
  );
}
