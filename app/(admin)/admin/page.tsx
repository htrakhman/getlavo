import { PageHeader } from '@/components/PortalShell';
import { supabaseServer } from '@/lib/supabase/server';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const ROLE_TONE: Record<string, string> = {
  admin: 'text-gleam',
  operator: 'text-amber-600',
  building: 'text-sky-400',
  resident: 'text-ink-300',
};

export default async function AdminOverview() {
  const sb = supabaseServer();
  const monthStart = new Date().toISOString().slice(0, 8) + '01';

  const [
    { count: totalBuildings },
    { count: totalOperators },
    { count: monthWashes },
    { data: revenue },
    { data: pendingInsurance },
    { data: pendingOperators },
    { data: recentSignups },
    { data: insuranceExpiring },
  ] = await Promise.all([
    sb.from('buildings').select('*', { count: 'exact', head: true }),
    sb.from('operators').select('*', { count: 'exact', head: true }),
    sb.from('washes').select('*', { count: 'exact', head: true }).gte('completed_at', monthStart),
    sb.from('bookings').select('fee_cents').gte('created_at', monthStart),
    sb
      .from('operators')
      .select('id, name, insurance_expires_at, insurance_uploaded_at, owner:profiles!owner_id(email)')
      .eq('insurance_review_status', 'pending_review')
      .order('insurance_uploaded_at', { ascending: true }),
    sb
      .from('operators')
      .select('id, name, created_at, owner:profiles!owner_id(email)')
      .eq('status', 'pending_review')
      .order('created_at', { ascending: false }),
    sb
      .from('profiles')
      .select('id, full_name, email, role, created_at')
      .order('created_at', { ascending: false })
      .limit(8),
    sb
      .from('operators')
      .select('id, name, insurance_expires_at')
      .not('insurance_expires_at', 'is', null)
      .order('insurance_expires_at', { ascending: true })
      .limit(5),
  ]);

  const platformRevenue = (revenue ?? []).reduce((s, r: any) => s + (r.fee_cents ?? 0), 0);
  const insuranceCount = pendingInsurance?.length ?? 0;
  const operatorCount = pendingOperators?.length ?? 0;
  const pendingTotal = insuranceCount + operatorCount;

  return (
    <>
      <PageHeader eyebrow="Admin" title="Overview" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Stat label="Buildings" value={totalBuildings ?? 0} />
        <Stat label="Operators" value={totalOperators ?? 0} />
        <Stat label="Washes (mo)" value={monthWashes ?? 0} />
        <Stat label="Revenue (mo)" value={`$${(platformRevenue / 100).toFixed(2)}`} />
      </div>

      {/* Needs your approval */}
      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-display text-2xl">Needs your approval</h2>
        {pendingTotal > 0 && (
          <span className="chip text-amber-600">{pendingTotal} pending</span>
        )}
      </div>

      {pendingTotal === 0 ? (
        <div className="card mt-3 p-6 text-sm text-ink-400">Nothing waiting on you right now. 🎉</div>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="card p-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-xl">Insurance certificates</h3>
              <Link href="/admin/insurance" className="text-xs text-gleam">Review all →</Link>
            </div>
            {insuranceCount > 0 ? (
              <ul className="divide-y divide-white/5">
                {pendingInsurance!.map((o: any) => (
                  <li key={o.id} className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <div>{o.name}</div>
                      <div className="text-xs text-ink-400">{o.owner?.email}</div>
                    </div>
                    <Link href="/admin/insurance" className="btn-quiet text-xs">Approve / reject →</Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-400">No certificates awaiting review.</p>
            )}
          </div>

          <div className="card p-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-xl">Operator applications</h3>
              <Link href="/admin/operators" className="text-xs text-gleam">All operators →</Link>
            </div>
            {operatorCount > 0 ? (
              <ul className="divide-y divide-white/5">
                {pendingOperators!.map((o: any) => (
                  <li key={o.id} className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <div>{o.name}</div>
                      <div className="text-xs text-ink-400">{o.owner?.email}</div>
                    </div>
                    <Link href={`/admin/operators/${o.id}`} className="btn-quiet text-xs">Review →</Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-400">No operator applications pending.</p>
            )}
          </div>
        </div>
      )}

      {/* Recent signups + insurance expiring */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-xl">Recent signups</h3>
            <Link href="/admin/users" className="text-xs text-gleam">All users →</Link>
          </div>
          {recentSignups && recentSignups.length > 0 ? (
            <ul className="divide-y divide-white/5">
              {recentSignups.map((u: any) => (
                <li key={u.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <div>{u.full_name || u.email}</div>
                    <div className="text-xs text-ink-400">{u.email}</div>
                  </div>
                  <div className="text-right">
                    <span className={`chip ${ROLE_TONE[u.role] ?? 'text-ink-300'}`}>{u.role ?? '—'}</span>
                    <div className="mt-0.5 text-xs text-ink-500">{u.created_at?.slice(0, 10)}</div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-400">No signups yet.</p>
          )}
        </div>

        <div className="card p-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-xl">Insurance expiring</h3>
            <Link href="/admin/insurance" className="text-xs text-gleam">Review →</Link>
          </div>
          {insuranceExpiring && insuranceExpiring.length > 0 ? (
            <ul className="divide-y divide-white/5">
              {insuranceExpiring.map((o: any) => (
                <li key={o.id} className="flex justify-between py-2 text-sm">
                  <span>{o.name}</span>
                  <span className="text-amber-600">{o.insurance_expires_at}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-400">None.</p>
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
