import { PageHeader } from '@/components/PortalShell';
import { getAvailableBuildingsForOperator } from '@/lib/operator-available-buildings';
import { getSessionUser, supabaseServer, supabaseAdmin } from '@/lib/supabase/server';
import { AvailableBuildings } from './AvailableBuildings';
import { PartnershipRequests } from '../PartnershipRequests';
import { redirect } from 'next/navigation';
import { parseDateList, futureDates } from '@/lib/wash-dates';
import { dateShort } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function OperatorBuildings() {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  const sb = supabaseServer();
  const admin = supabaseAdmin();
  const { data: op } = await sb.from('operators').select('id, name').eq('owner_id', session.user.id).maybeSingle();

  const [{ data: partnerships }, { data: pendingPartnerships }, availableData] = await Promise.all([
    admin
      .from('partnerships')
      .select('id, status, connected_at, building:buildings(name, address_line1, city, region, total_units, wash_day, preferred_wash_day, requested_wash_dates)')
      .eq('operator_id', op?.id ?? '')
      .eq('status', 'active')
      .order('connected_at', { ascending: false }),
    // Manager-initiated requests waiting on this operator (admin: RLS-independent read)
    admin
      .from('partnerships')
      .select('id, created_at, requested_by, building:buildings(id, name, city, address_line1, manager_id)')
      .eq('operator_id', op?.id ?? '')
      .eq('status', 'pending')
      .order('created_at'),
    op?.id ? getAvailableBuildingsForOperator(op.id) : Promise.resolve({ available: [], pendingByBuildingId: new Map() }),
  ]);

  const pendingRecord = Object.fromEntries(availableData.pendingByBuildingId);
  const incomingRequests = (pendingPartnerships ?? []).filter(
    (p: any) => p.requested_by === p.building?.manager_id,
  );

  return (
    <>
      <PageHeader eyebrow={op?.name} title="Buildings" />

      {incomingRequests.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-1 font-display text-xl">Buildings that want to partner with you</h2>
          <p className="mb-4 text-sm text-ink-400">
            These property managers requested you directly. Accept to activate the partnership.
          </p>
          <PartnershipRequests requests={incomingRequests as any} />
        </section>
      )}

      <section className="mb-10">
        <h2 className="mb-4 font-display text-xl">Your buildings</h2>
        <div className="space-y-4">
          {(partnerships ?? []).map((p: any) => {
            const weeklyDay = p.building.wash_day ?? p.building.preferred_wash_day;
            const requestedDates = futureDates(parseDateList(p.building.requested_wash_dates));
            return (
              <div key={p.id} className="card flex items-center justify-between p-6">
                <div>
                  <div className="font-display text-xl">{p.building.name}</div>
                  <div className="text-sm text-ink-400">
                    {p.building.address_line1} · {p.building.city}, {p.building.region}
                  </div>
                  {p.building.total_units && (
                    <div className="mt-1 text-xs text-ink-500">{p.building.total_units} units</div>
                  )}
                  {(weeklyDay || requestedDates.length > 0) && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      {weeklyDay && <span className="chip">Wash day: {weeklyDay}</span>}
                      {requestedDates.map((d: string) => (
                        <span key={d} className="chip text-gleam">
                          {dateShort(d)}
                        </span>
                      ))}
                    </div>
                  )}
                  {requestedDates.length > 0 && (
                    <p className="mt-1 text-xs text-ink-500">
                      Dates this building chose — they&rsquo;re confirmed on your wash day calendar.
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <span className="chip text-gleam">Active</span>
                </div>
              </div>
            );
          })}
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
