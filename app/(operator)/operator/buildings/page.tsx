import { PageHeader } from '@/components/PortalShell';
import { supabaseServer } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function OperatorBuildings() {
  const sb = supabaseServer();
  const { data: op } = await sb.from('operators').select('id, name').limit(1).maybeSingle();

  const { data: partnerships } = await sb
    .from('partnerships')
    .select('id, status, connected_at, building:buildings(name, address_line1, city, region, total_units)')
    .eq('operator_id', op?.id ?? '')
    .eq('status', 'active')
    .order('connected_at', { ascending: false });

  return (
    <>
      <PageHeader eyebrow={op?.name} title="Active buildings" />
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
          <div className="card p-10 text-center text-ink-400">
            No buildings assigned yet. Lavo will notify you when a building is matched to you.
          </div>
        )}
      </div>
    </>
  );
}
