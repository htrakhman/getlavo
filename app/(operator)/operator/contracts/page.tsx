import { PageHeader } from '@/components/PortalShell';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  pending_signatures: 'Pending signatures',
  executed: 'Executed',
  terminated: 'Terminated',
};

const STATUS_COLOR: Record<string, string> = {
  draft: 'text-ink-400',
  pending_signatures: 'text-yellow-300',
  executed: 'text-gleam',
  terminated: 'text-red-400',
};

export default async function OperatorContractsPage() {
  const session = await getSessionUser();
  if (!session) redirect('/login');

  const sb = supabaseServer();
  const { data: op } = await sb
    .from('operators')
    .select('id, name')
    .eq('owner_id', session.user.id)
    .maybeSingle();
  if (!op) redirect('/operator/onboarding');

  const { data: contracts } = await sb
    .from('contracts')
    .select('id, status, created_at, manager_signed_at, operator_signed_at, fully_executed_at, building:buildings(id, name, address_line1, city, region)')
    .eq('operator_id', op.id)
    .order('created_at', { ascending: false });

  return (
    <>
      <PageHeader eyebrow={op.name} title="Service agreements" />

      {!contracts?.length ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-ink-400">No contracts yet. They appear here once a building manager initiates one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contracts.map((c: any) => {
            const building = c.building;
            const needsYourSig = c.status !== 'executed' && !c.operator_signed_at;
            return (
              <Link
                key={c.id}
                href={`/operator/contracts/${c.id}`}
                className="card block p-5 hover:border-white/20 transition"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium text-white">{building?.name ?? '—'}</div>
                    <div className="mt-0.5 text-xs text-ink-400">
                      {building?.city}, {building?.region} · Created {c.created_at?.slice(0, 10)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-sm font-medium ${STATUS_COLOR[c.status] ?? 'text-ink-300'}`}>
                      {STATUS_LABEL[c.status] ?? c.status}
                    </div>
                    {needsYourSig && (
                      <div className="mt-0.5 text-xs text-yellow-300">Needs your signature →</div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
