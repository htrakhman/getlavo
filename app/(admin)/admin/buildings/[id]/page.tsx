import { PageHeader } from '@/components/PortalShell';
import { supabaseServer } from '@/lib/supabase/server';
import { AssignOperator } from './AssignOperator';

export default async function AdminBuildingDetail({ params }: { params: { id: string } }) {
  const sb = supabaseServer();

  const [{ data: building }, { data: partnership }, { count: residentCount }, { data: operators }] = await Promise.all([
    sb.from('buildings').select('*, manager:profiles!manager_id(email, full_name)').eq('id', params.id).maybeSingle(),
    sb.from('partnerships').select('id, status, operator:operators(id, name)').eq('building_id', params.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    sb.from('residents').select('*', { count: 'exact', head: true }).eq('building_id', params.id),
    sb.from('operators').select('id, name').eq('status', 'approved'),
  ]);

  if (!building) return <div>Not found.</div>;

  return (
    <>
      <PageHeader eyebrow="Admin · Building" title={building.name} />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="card p-6">
          <h3 className="font-display text-lg">Details</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <Row k="Status" v={building.status} />
            <Row k="City" v={`${building.city}, ${building.region}`} />
            <Row k="Manager" v={building.manager?.email ?? '—'} />
            <Row k="Slug" v={building.slug ?? '—'} />
            <Row k="Wash day" v={building.wash_day ?? 'TBD'} />
            <Row k="Residents" v={String(residentCount ?? 0)} />
          </dl>
        </div>
        <div className="card p-6">
          <h3 className="font-display text-lg">Operator</h3>
          <div className="mt-2 text-sm">
            {partnership?.operator ? (
              <>
                <div>{(partnership.operator as any).name}</div>
                <span className="chip mt-1 inline-block">{partnership.status}</span>
              </>
            ) : <div className="text-ink-400">No operator assigned.</div>}
          </div>
          <div className="mt-4">
            <AssignOperator buildingId={building.id} operators={operators ?? []} />
          </div>
        </div>
      </div>
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-ink-400">{k}</dt>
      <dd className="text-ink-200">{v}</dd>
    </div>
  );
}
