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

  const { data: monthRev } = await sb.from('bookings').select('fee_cents').gte('created_at', monthStart);
  const platformRev = (monthRev ?? []).reduce((s, b: any) => s + (b.fee_cents ?? 0), 0);

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
    </>
  );
}
