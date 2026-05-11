import { PageHeader } from '@/components/PortalShell';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getCurrentBuildingForSession } from '@/lib/building';
import { RetentionChart } from './RetentionChart';

export default async function InsightsPage() {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  const { current: building } = await getCurrentBuildingForSession(session.user.id);
  if (!building) redirect('/building/onboarding');

  const sb = supabaseServer();

  const sixMonthsAgo = new Date(Date.now() - 180 * 86400000).toISOString();

  const [{ data: residents }, { count: totalResidents }] = await Promise.all([
    sb.from('residents')
      .select('id, created_at')
      .eq('building_id', building.id)
      .order('created_at'),
    sb.from('residents').select('*', { count: 'exact', head: true }).eq('building_id', building.id),
  ]);

  const residentIds = (residents ?? []).map((r) => r.id);

  const [{ data: monthWashes }, { data: ratings }] = await Promise.all([
    residentIds.length
      ? sb.from('washes')
          .select('id')
          .in('resident_id', residentIds)
          .gte('completed_at', sixMonthsAgo)
          .eq('status', 'completed')
      : Promise.resolve({ data: [] }),
    residentIds.length
      ? sb.from('wash_reviews')
          .select('rating')
          .in('resident_id', residentIds)
      : Promise.resolve({ data: [] }),
  ]);

  // Build cumulative signups by month
  const byMonth = new Map<string, number>();
  for (const r of residents ?? []) {
    const m = r.created_at.slice(0, 7);
    byMonth.set(m, (byMonth.get(m) ?? 0) + 1);
  }
  const months: string[] = [];
  const cur = new Date();
  cur.setDate(1);
  for (let i = 5; i >= 0; i--) {
    const d = new Date(cur);
    d.setMonth(cur.getMonth() - i);
    months.push(d.toISOString().slice(0, 7));
  }
  let cumulative = 0;
  for (const m of byMonth.keys()) {
    if (m < months[0]) cumulative += byMonth.get(m) ?? 0;
  }
  const series = months.map((m) => {
    cumulative += byMonth.get(m) ?? 0;
    return { month: m, value: cumulative };
  });

  return (
    <>
      <PageHeader eyebrow={building.name} title="Insights" />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 mb-8">
        <Stat label="Residents enrolled" value={totalResidents ?? 0} accent="text-gleam" />
        <Stat label="Washes (6 mo)" value={monthWashes?.length ?? 0} />
        <Stat label="Avg rating" value={
          ratings?.length
            ? (ratings.reduce((s, r: any) => s + r.rating, 0) / ratings.length).toFixed(1) + ' ★'
            : '—'
        } />
      </div>

      <div className="card p-6">
        <h2 className="font-display text-lg mb-4">Cumulative residents enrolled</h2>
        <RetentionChart data={series} />
      </div>
    </>
  );
}

function Stat({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <div className="stat">
      <div className="text-xs uppercase tracking-widest text-ink-300">{label}</div>
      <div className={`mt-2 font-display text-3xl ${accent ?? ''}`}>{value}</div>
    </div>
  );
}
