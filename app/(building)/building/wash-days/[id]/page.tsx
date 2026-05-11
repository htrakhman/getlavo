import { PageHeader } from '@/components/PortalShell';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getCurrentBuildingForSession } from '@/lib/building';
import { dateShort } from '@/lib/format';
import { LiveRefresh } from './LiveRefresh';
import { ConfirmProposal } from './ConfirmProposal';

export default async function BuildingWashDayDetail({ params }: { params: { id: string } }) {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  const { current: building } = await getCurrentBuildingForSession(session.user.id);
  if (!building) redirect('/building/onboarding');

  const sb = supabaseServer();
  const { data: wd } = await sb
    .from('wash_days')
    .select('id, scheduled_for, started_at, completed_at, confirmation, operator:operators(name)')
    .eq('id', params.id)
    .eq('building_id', building.id)
    .maybeSingle();
  if (!wd) return <div className="p-6">Not found.</div>;

  const { data: washes } = await sb
    .from('washes')
    .select(`
      id, status, completed_at, photo_url, flag_reason, spot_label,
      vehicle:vehicles(make, model, color, year, license_plate),
      resident:residents(unit_number, floor_number, profile:profiles(full_name))
    `)
    .eq('wash_day_id', wd.id);

  const total = washes?.length ?? 0;
  const completed = (washes ?? []).filter((w: any) => w.status === 'completed').length;
  const flagged = (washes ?? []).filter((w: any) => w.status === 'flagged').length;
  const inProgress = (washes ?? []).filter((w: any) => w.status === 'in_progress').length;

  return (
    <>
      {!wd.completed_at && wd.started_at && <LiveRefresh />}

      <PageHeader
        eyebrow={`${building.name} · ${dateShort(wd.scheduled_for)}`}
        title="Wash day"
        action={wd.completed_at
          ? <span className="chip text-gleam">Completed</span>
          : wd.started_at
            ? <span className="chip text-amber-300 animate-pulse">Live · refreshing</span>
            : wd.confirmation === 'pending'
              ? <ConfirmProposal washDayId={wd.id} />
              : <span className="chip">Scheduled</span>}
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-8">
        <Stat label="Total" value={total} />
        <Stat label="Completed" value={completed} />
        <Stat label="In progress" value={inProgress} />
        <Stat label="Flagged" value={flagged} />
      </div>

      <div className="mb-6">
        <div className="h-2 overflow-hidden rounded-full bg-white/5">
          <div className="h-full bg-gleam transition-all" style={{ width: `${total ? (completed / total) * 100 : 0}%` }} />
        </div>
        <div className="mt-1 text-xs text-ink-400">{completed} of {total} done</div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-widest text-ink-400">
            <tr>
              <th className="px-4 py-2 text-left">Spot</th>
              <th className="px-4 py-2 text-left">Resident</th>
              <th className="px-4 py-2 text-left">Vehicle</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Photo</th>
            </tr>
          </thead>
          <tbody>
            {(washes ?? [])
              .sort((a: any, b: any) => (a.spot_label ?? '').localeCompare(b.spot_label ?? ''))
              .map((w: any) => (
                <tr key={w.id} className="border-t border-white/5 align-top">
                  <td className="px-4 py-3 font-mono text-xs">{w.spot_label ?? '—'}</td>
                  <td className="px-4 py-3 text-xs">{w.resident?.profile?.full_name} · Unit {w.resident?.unit_number}</td>
                  <td className="px-4 py-3 text-xs">{w.vehicle?.year} {w.vehicle?.make} {w.vehicle?.model}</td>
                  <td className="px-4 py-3">
                    <span className={`chip ${w.status === 'completed' ? 'text-gleam' : w.status === 'flagged' ? 'text-amber-300' : ''}`}>
                      {w.status}
                    </span>
                    {w.flag_reason && <div className="mt-1 text-[10px] text-amber-300">{w.flag_reason}</div>}
                  </td>
                  <td className="px-4 py-3">
                    {w.photo_url ? <a href={w.photo_url} target="_blank" rel="noreferrer">
                      <img src={w.photo_url} alt="" className="h-12 w-12 rounded object-cover" />
                    </a> : <span className="text-xs text-ink-500">—</span>}
                  </td>
                </tr>
              ))}
            {!washes?.length && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-ink-400">No vehicles scheduled.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat">
      <div className="text-xs uppercase tracking-widest text-ink-300">{label}</div>
      <div className="mt-2 font-display text-3xl">{value}</div>
    </div>
  );
}
