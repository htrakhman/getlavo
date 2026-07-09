import { PageHeader } from '@/components/PortalShell';
import { getAvailableBuildingsForOperator } from '@/lib/operator-available-buildings';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { AvailableBuildings } from './AvailableBuildings';
import { redirect } from 'next/navigation';

export default async function OperatorBuildings() {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  const sb = supabaseServer();
  const { data: op } = await sb.from('operators').select('id, name').eq('owner_id', session.user.id).maybeSingle();

  const [{ data: partnerships }, availableData] = await Promise.all([
    sb
      .from('partnerships')
      .select('id, status, connected_at, building:buildings(name, address_line1, city, region, total_units)')
      .eq('operator_id', op?.id ?? '')
      .eq('status', 'active')
      .order('connected_at', { ascending: false }),
    op?.id ? getAvailableBuildingsForOperator(op.id) : Promise.resolve({ available: [], pendingByBuildingId: new Map() }),
  ]);

  const pendingRecord = Object.fromEntries(availableData.pendingByBuildingId);

  return (
    <>
      <PageHeader eyebrow={op?.name} title="Buildings" />

      <section className="mb-10">
        <h2 className="mb-4 font-display text-xl">Your buildings</h2>
        <div className="space-y-4">
          {(partnerships ?? []).map((p: any) => (
            <div key={p.id} className="card flex items-center justify-between p-6">
              <div>
                <div className="font-display text-xl">{p.building.name}</div>
                <div className="text-sm text-ink-400">
                  {p.building.address_line1} · {p.building.city}, {p.building.region}
                </div>
                {p.building.total_units && (
                  <div className="mt-1 text-xs text-ink-500">{p.building.total_units} units</div>
                )}
              </div>
              <div className="text-right">
                <span className="chip text-gleam">Active</span>
              </div>
            </div>
          ))}
          {!partnerships?.length && (
            <div className="card p-8 text-center text-ink-400">
              No buildings assigned yet. Browse available buildings below to request a partnership.
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-1 font-display text-xl">Available buildings</h2>
        <p className="mb-4 text-sm text-ink-400">
          Buildings without an operator yet. Request to partner — the property manager gets an email, and Lavo can also match you manually.
        </p>
        <AvailableBuildings
          buildings={availableData.available}
          pendingByBuildingId={pendingRecord}
        />
      </section>
    </>
  );
}
