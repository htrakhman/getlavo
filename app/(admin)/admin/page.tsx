import { PageHeader } from '@/components/PortalShell';
import { supabaseServer } from '@/lib/supabase/server';

export default async function AdminOverview() {
  const sb = supabaseServer();

  const monthStart = new Date().toISOString().slice(0, 8) + '01';

  const [
    { count: totalBuildings },
    { count: totalOperators },
    { count: monthWashes },
    { data: revenue },
    { data: insuranceExpiring },
    { data: unassigned },
  ] = await Promise.all([
    sb.from('buildings').select('*', { count: 'exact', head: true }),
    sb.from('operators').select('*', { count: 'exact', head: true }),
    sb.from('washes').select('*', { count: 'exact', head: true }).gte('completed_at', monthStart),
    sb.from('bookings').select('fee_cents').gte('created_at', monthStart),
    sb.from('operators').select('id, name, insurance_expires_at').not('insurance_expires_at', 'is', null).order('insurance_expires_at', { ascending: true }).limit(5),
    sb.from('buildings').select('id, name').in('status', ['prospect', 'pilot', 'active']).limit(20),
  ]);

  const platformRevenue = (revenue ?? []).reduce((s, r: any) => s + (r.fee_cents ?? 0), 0);

  return (
    <>
      <PageHeader eyebrow="Admin" title="Overview" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Stat label="Buildings" value={totalBuildings ?? 0} />
        <Stat label="Operators" value={totalOperators ?? 0} />
        <Stat label="Washes (mo)" value={monthWashes ?? 0} />
        <Stat label="Revenue (mo)" value={`$${(platformRevenue / 100).toFixed(2)}`} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h3 className="font-display text-xl mb-3">Insurance expiring</h3>
          {insuranceExpiring && insuranceExpiring.length > 0 ? (
            <ul className="divide-y divide-white/5">
              {insuranceExpiring.map((o: any) => (
                <li key={o.id} className="flex justify-between py-2 text-sm">
                  <span>{o.name}</span>
                  <span className="text-amber-300">{o.insurance_expires_at}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-ink-400">None.</p>}
        </div>

        <div className="card p-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-xl">Buildings</h3>
            <a href="/admin/buildings" className="text-xs text-gleam">All →</a>
          </div>
          {unassigned && unassigned.length > 0 ? (
            <ul className="divide-y divide-white/5">
              {unassigned.map((b: any) => (
                <li key={b.id} className="py-2 text-sm">{b.name}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-400">No buildings yet.</p>
          )}
        </div>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="stat">
      <div className="text-xs uppercase tracking-widest text-ink-300">{label}</div>
      <div className="mt-2 font-display text-4xl">{value}</div>
    </div>
  );
}
