import { PageHeader } from '@/components/PortalShell';
import { supabaseServer } from '@/lib/supabase/server';
import { RefundButton } from './RefundButton';

export default async function AdminPayments() {
  const sb = supabaseServer();

  const monthStart = new Date().toISOString().slice(0, 8) + '01';

  const { data: bookings } = await sb
    .from('bookings')
    .select('id, scheduled_for, gross_cents, fee_cents, net_cents, status, stripe_payment_intent_id, building:buildings(name), operator:operators(name), resident:residents(profile:profiles(full_name))')
    .order('created_at', { ascending: false })
    .limit(100);

  const { data: charges } = await sb
    .from('charges')
    .select('id, created_at, amount_cents, fee_cents, status, failure_reason, stripe_payment_intent_id, operator:operators(name), resident:residents(profile:profiles(full_name)), wash_day:wash_days(scheduled_for, building:buildings(name))')
    .order('created_at', { ascending: false })
    .limit(100);

  const { data: monthRev } = await sb.from('bookings').select('fee_cents').gte('created_at', monthStart);
  const { data: monthChargeRev } = await sb.from('charges').select('fee_cents').eq('status', 'succeeded').gte('created_at', monthStart);
  const platformRev =
    (monthRev ?? []).reduce((s, b: any) => s + (b.fee_cents ?? 0), 0) +
    (monthChargeRev ?? []).reduce((s, c: any) => s + (c.fee_cents ?? 0), 0);

  return (
    <>
      <PageHeader eyebrow="Admin" title="Payments" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-6">
        <div className="stat">
          <div className="text-xs uppercase tracking-widest text-ink-300">Revenue this month</div>
          <div className="mt-2 font-display text-3xl">${(platformRev / 100).toFixed(2)}</div>
        </div>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-widest text-ink-400">
            <tr>
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-left">Building</th>
              <th className="px-4 py-2 text-left">Operator</th>
              <th className="px-4 py-2 text-right">Gross</th>
              <th className="px-4 py-2 text-right">Fee</th>
              <th className="px-4 py-2 text-right">Net</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-right">&nbsp;</th>
            </tr>
          </thead>
          <tbody>
            {(bookings ?? []).map((b: any) => (
              <tr key={b.id} className="border-t border-white/5">
                <td className="px-4 py-3">{b.scheduled_for}</td>
                <td className="px-4 py-3">{b.building?.name}</td>
                <td className="px-4 py-3">{b.operator?.name}</td>
                <td className="px-4 py-3 text-right">${(b.gross_cents / 100).toFixed(2)}</td>
                <td className="px-4 py-3 text-right text-ink-400">${(b.fee_cents / 100).toFixed(2)}</td>
                <td className="px-4 py-3 text-right text-gleam">${(b.net_cents / 100).toFixed(2)}</td>
                <td className="px-4 py-3"><span className="chip">{b.status}</span></td>
                <td className="px-4 py-3 text-right">
                  {b.stripe_payment_intent_id && b.status !== 'cancelled' && <RefundButton bookingId={b.id} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-8 mb-3 text-xs uppercase tracking-widest text-ink-400">Wash-day charges</h2>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-widest text-ink-400">
            <tr>
              <th className="px-4 py-2 text-left">Wash day</th>
              <th className="px-4 py-2 text-left">Building</th>
              <th className="px-4 py-2 text-left">Resident</th>
              <th className="px-4 py-2 text-left">Operator</th>
              <th className="px-4 py-2 text-right">Amount</th>
              <th className="px-4 py-2 text-right">Fee</th>
              <th className="px-4 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {(charges ?? []).map((c: any) => (
              <tr key={c.id} className="border-t border-white/5">
                <td className="px-4 py-3">{c.wash_day?.scheduled_for ?? c.created_at?.slice(0, 10)}</td>
                <td className="px-4 py-3">{c.wash_day?.building?.name}</td>
                <td className="px-4 py-3 text-xs text-ink-400">{c.resident?.profile?.full_name ?? '—'}</td>
                <td className="px-4 py-3">{c.operator?.name}</td>
                <td className="px-4 py-3 text-right">${(c.amount_cents / 100).toFixed(2)}</td>
                <td className="px-4 py-3 text-right text-ink-400">${(c.fee_cents / 100).toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span className={`chip ${c.status === 'succeeded' ? 'text-gleam' : c.status === 'failed' ? 'text-amber-600' : ''}`}>{c.status}</span>
                  {c.failure_reason && <div className="mt-1 text-[10px] text-amber-600">{c.failure_reason}</div>}
                </td>
              </tr>
            ))}
            {!charges?.length && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-ink-400">No wash-day charges yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
