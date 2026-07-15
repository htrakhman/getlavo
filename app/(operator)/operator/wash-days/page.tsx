import { PageHeader } from '@/components/PortalShell';
import { parseWashDaysHub } from '@/lib/operator-wash-days-hub';
import { dateShort } from '@/lib/format';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ProposeWashDay } from './ProposeWashDay';
import { WashDaysHubPanel } from './WashDaysHubPanel';

export default async function WashDays() {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  const sb = supabaseServer();
  const { data: op } = await sb
    .from('operators')
    .select('id, wash_days_hub')
    .eq('owner_id', session.user.id)
    .maybeSingle();
  if (!op) redirect('/operator/onboarding');

  const hub = parseWashDaysHub(op.wash_days_hub);

  const [{ data: days }, { data: partnerships }] = await Promise.all([
    sb
      .from('wash_days')
      .select('id, scheduled_for, started_at, completed_at, confirmation, building:buildings(id, name), operator_id')
      .eq('operator_id', op.id)
      .order('scheduled_for', { ascending: false }),
    sb
      .from('partnerships')
      .select('building:buildings(id, name)')
      .eq('operator_id', op.id)
      .eq('status', 'active'),
  ]);
  const buildings = (partnerships ?? []).map((p: any) => p.building).filter(Boolean);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = (days ?? []).filter((d: any) => !d.completed_at && d.scheduled_for >= today);
  const past = (days ?? []).filter((d: any) => d.completed_at || d.scheduled_for < today);
  const isEmpty = !days?.length;

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Wash days"
        action={buildings.length > 0 ? <ProposeWashDay buildings={buildings} /> : null}
      />

      {upcoming.length > 0 && (
        <>
          <h2 className="text-xs uppercase tracking-widest text-ink-400 mb-3">Upcoming</h2>
          <div className="card divide-y divide-white/5 mb-8">
            {upcoming.map((wd: any) => (
              <div key={wd.id} className="flex items-center justify-between p-5 hover:bg-white/5">
                <div>
                  <div className="font-medium">{wd.building?.name}</div>
                  <div className="text-xs text-ink-400">
                    {dateShort(wd.scheduled_for)}
                    {wd.confirmation === 'pending' && (
                      <span className="ml-2 text-amber-300">· awaiting building confirmation</span>
                    )}
                    {wd.confirmation === 'declined' && (
                      <span className="ml-2 text-red-400">· declined</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/operator/wash-days/${wd.id}/prep`} className="btn-quiet text-xs">
                    Prep
                  </Link>
                  <Link href={`/operator/wash-days/${wd.id}`} className="btn-primary text-xs">
                    {wd.started_at ? 'Resume →' : 'Open →'}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {past.length > 0 && (
        <>
          <h2 className="text-xs uppercase tracking-widest text-ink-400 mb-3">Past</h2>
          <div className="card divide-y divide-white/5 mb-8">
            {past.map((wd: any) => (
              <Link
                key={wd.id}
                href={`/operator/wash-days/${wd.id}`}
                className="flex items-center justify-between p-5 hover:bg-white/5"
              >
                <div>
                  <div className="font-medium">{wd.building?.name}</div>
                  <div className="text-xs text-ink-400">{dateShort(wd.scheduled_for)}</div>
                </div>
                <span className="chip">{wd.completed_at ? 'completed' : 'missed'}</span>
              </Link>
            ))}
          </div>
        </>
      )}

      <WashDaysHubPanel
        operatorId={op.id}
        settings={hub}
        isEmpty={isEmpty}
        hasBuildings={buildings.length > 0}
      />
    </>
  );
}
