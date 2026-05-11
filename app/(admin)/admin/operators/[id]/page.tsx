import { PageHeader } from '@/components/PortalShell';
import { supabaseServer } from '@/lib/supabase/server';
import { OperatorStatusEditor } from './OperatorStatusEditor';

export default async function AdminOperatorDetail({ params }: { params: { id: string } }) {
  const sb = supabaseServer();
  const { data: op } = await sb.from('operators').select('*, owner:profiles!owner_id(email, full_name)').eq('id', params.id).maybeSingle();
  if (!op) return <div>Not found.</div>;

  const { data: assignments } = await sb
    .from('partnerships')
    .select('id, status, building:buildings(name)')
    .eq('operator_id', op.id);

  return (
    <>
      <PageHeader eyebrow="Admin · Operator" title={op.name} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2">
          <h3 className="font-display text-lg">Application</h3>
          <div className="mt-3 text-sm space-y-2">
            <div>Owner: {op.owner?.email}</div>
            <div>Status: <span className="chip">{op.status}</span></div>
            <div>Insurance: {op.insurance_doc_url ? <a href={op.insurance_doc_url} className="text-gleam" target="_blank" rel="noreferrer">View</a> : 'Not uploaded'}</div>
            <div>Stripe: {op.stripe_onboarding_complete ? 'Connected' : 'Not connected'}</div>
          </div>
          <div className="mt-6">
            <OperatorStatusEditor operatorId={op.id} status={op.status} />
          </div>
        </div>
        <div className="card p-6">
          <h3 className="font-display text-lg">Assigned buildings</h3>
          <ul className="mt-2 text-sm space-y-1">
            {(assignments ?? []).map((a: any) => (
              <li key={a.id}>{a.building?.name} — {a.status}</li>
            ))}
            {!assignments?.length && <li className="text-ink-400">None.</li>}
          </ul>
        </div>
      </div>
    </>
  );
}
