import { PageHeader } from '@/components/PortalShell';
import { supabaseServer, getSessionUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { dateShort, money } from '@/lib/format';

export default async function Earnings() {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  const sb = supabaseServer();
  const { data: op } = await sb
    .from('operators')
    .select('id, name, payout_reserve_percent')
    .eq('owner_id', session.user.id)
    .maybeSingle();
  if (!op) return null;

  const reservePct = Number(op.payout_reserve_percent ?? 5);

  const monthStart = new Date().toISOString().slice(0, 8) + '01';
  const last30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const [{ data: payouts }, { data: bookings }, { count: completedThisMonth }] = await Promise.all([
    sb.from('payouts').select('*').eq('operator_id', op.id).order('period_end', { ascending: false }),
    sb.from('bookings')
      .select('id, scheduled_for, gross_cents, fee_cents, net_cents, status, building:buildings(name), resident:residents(profile:profiles(full_name))')
      .eq('operator_id', op.id)
      .gte('scheduled_for', last30)
      .order('scheduled_for', { ascending: false })
      .limit(30),
    sb.from('bookings').select('*', { count: 'exact', head: true }).eq('operator_id', op.id).gte('completed_at', monthStart),
  ]);

  const lifetimeNet = (payouts ?? []).reduce((s, p) => s + (p.net_cents ?? 0), 0);
  const pending = (payouts ?? []).filter((p) => p.status === 'pending').reduce((s, p) => s + (p.net_cents ?? 0), 0);
  const monthGross = (bookings ?? []).reduce((s, b: any) => s + (b.gross_cents ?? 0), 0);
  const monthNet = (bookings ?? []).reduce((s, b: any) => s + (b.net_cents ?? 0), 0);

  return (
    <>
      <PageHeader eyebrow={op.name} title="Earnings & payouts" />
      <p className="text-sm text-ink-500 mb-6">
        A rolling {reservePct}% reserve may be held for dispute coverage. Shown here for transparency with your operator agreement.
      </p>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-8">
        <Stat label="Lifetime net" value={money(lifetimeNet)} />
        <Stat label="Pending payout" value={money(pending)} />
        <Stat label="This month gross" value={money(monthGross)} />
        <Stat label="Washes this month" value={String(completedThisMonth ?? 0)} />
      </div>

      <h2 className="mb-3 text-xs uppercase tracking-widest text-ink-400">Recent washes (last 30 days)</h2>
      <div className="card overflow-hidden mb-8">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-widest text-ink-400">
            <tr>
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-left">Building</th>
              <th className="px-4 py-2 text-left">Resident</th>
              <th className="px-4 py-2 text-right">Gross</th>
              <th className="px-4 py-2 text-right">Fee</th>
              <th className="px-4 py-2 text-right">Net</th>
              <th className="px-4 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {(bookings ?? []).map((b: any) => (
              <tr key={b.id} className="border-t border-white/5">
                <td className="px-4 py-3">{dateShort(b.scheduled_for)}</td>
                <td className="px-4 py-3">{b.building?.name}</td>
                <td className="px-4 py-3 text-xs text-ink-400">{b.resident?.profile?.full_name ?? '—'}</td>
                <td className="px-4 py-3 text-right">{money(b.gross_cents)}</td>
                <td className="px-4 py-3 text-right text-ink-400">{money(b.fee_cents)}</td>
                <td className="px-4 py-3 text-right text-gleam">{money(b.net_cents)}</td>
                <td className="px-4 py-3"><span className="chip">{b.status}</span></td>
              </tr>
            ))}
            {!bookings?.length && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-ink-400">No washes in the last 30 days.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="mb-3 text-xs uppercase tracking-widest text-ink-400">Payouts</h2>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-white/5 text-left text-xs uppercase tracking-widest text-ink-400">
            <tr>
              <th className="px-5 py-3">Period</th>
              <th className="px-5 py-3 text-right">Gross</th>
              <th className="px-5 py-3 text-right">Fee</th>
              <th className="px-5 py-3 text-right">Net</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {(payouts ?? []).map((p) => (
              <tr key={p.id} className="hover:bg-white/5">
                <td className="px-5 py-3">{dateShort(p.period_start)} – {dateShort(p.period_end)}</td>
                <td className="px-5 py-3 text-right">{money(p.gross_cents)}</td>
                <td className="px-5 py-3 text-right text-ink-400">{money(p.fee_cents)}</td>
                <td className="px-5 py-3 text-right font-medium">{money(p.net_cents)}</td>
                <td className="px-5 py-3"><span className="chip">{p.status}</span></td>
              </tr>
            ))}
            {!payouts?.length && (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-ink-400">No payouts yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <div className="text-xs uppercase tracking-widest text-ink-300">{label}</div>
      <div className="mt-2 font-display text-3xl">{value}</div>
    </div>
  );
}
