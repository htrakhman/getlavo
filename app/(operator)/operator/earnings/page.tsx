import { PageHeader } from '@/components/PortalShell';
import { supabaseAdmin, getSessionUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { dateShort, money } from '@/lib/format';

export default async function Earnings() {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  // Admin client, scoped to the operator owned by the signed-in user —
  // RLS-scoped bookings reads can fail on missing table grants (see 0033).
  const admin = supabaseAdmin();
  const { data: op } = await admin
    .from('operators')
    .select('id, name')
    .eq('owner_id', session.user.id)
    .maybeSingle();
  if (!op) return <p className="p-10 text-ink-400">Operator profile not found.</p>;

  const last30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const [{ data: payouts }, { data: bookings, error: bookingsError }, { data: washCharges }] = await Promise.all([
    admin.from('payouts').select('*').eq('operator_id', op.id).order('period_end', { ascending: false }),
    admin.from('bookings')
      .select('id, scheduled_for, gross_cents, fee_cents, processing_fee_cents, net_cents, status, paid_at, stripe_payment_intent_id, building:buildings(name), resident:residents(profile:profiles(full_name))')
      .eq('operator_id', op.id)
      .gte('scheduled_for', last30)
      .order('scheduled_for', { ascending: false })
      .limit(30),
    // Wash-day service charges (per-wash package billing) count as earnings
    // alongside resident-booked one-offs. Every status is fetched, not just
    // succeeded: a wash whose charge failed still happened, and the operator
    // needs to see that it didn't get paid rather than have it disappear.
    admin.from('charges')
      .select('id, created_at, amount_cents, fee_cents, processing_fee_cents, status, booking_id, wash_day:wash_days(scheduled_for, building:buildings(name)), resident:residents(profile:profiles(full_name))')
      .eq('operator_id', op.id)
      .gte('created_at', last30)
      .order('created_at', { ascending: false })
      .limit(60),
  ]);
  if (bookingsError) {
    console.error('[operator/earnings] bookings query failed', { message: bookingsError.message });
  }

  // A charge mirroring a prepaid booking is the same money — keep the ledger
  // row and drop the booking so the wash isn't counted (or paid out) twice.
  const chargedBookingIds = new Set(
    (washCharges ?? []).map((c: any) => c.booking_id).filter(Boolean)
  );

  // Normalize both revenue sources into the "recent washes" table shape.
  // `paid` is what the money stats are built from — a row can be listed
  // without having been paid, but it never counts toward earnings.
  const recent = [
    ...(bookings ?? [])
      .filter((b: any) => !chargedBookingIds.has(b.id))
      .map((b: any) => {
        const paid = !!b.paid_at && (!!b.stripe_payment_intent_id || (b.gross_cents ?? 0) <= 0);
        return {
          id: `b-${b.id}`,
          date: b.scheduled_for,
          building: b.building?.name,
          resident: b.resident?.profile?.full_name,
          gross: b.gross_cents ?? 0,
          // What comes off the top: Lavo's take and the card processing it
          // covers. Shown as one deduction so gross − fee always equals net.
          fee: (b.fee_cents ?? 0) + (b.processing_fee_cents ?? 0),
          net: b.net_cents ?? 0,
          status: paid ? b.status : b.status === 'confirmed' ? 'payment pending' : b.status,
          paid,
        };
      }),
    ...(washCharges ?? []).map((c: any) => ({
      id: `c-${c.id}`,
      date: c.wash_day?.scheduled_for ?? c.created_at?.slice(0, 10),
      building: c.wash_day?.building?.name,
      resident: c.resident?.profile?.full_name,
      gross: c.amount_cents ?? 0,
      fee: (c.fee_cents ?? 0) + (c.processing_fee_cents ?? 0),
      net: (c.amount_cents ?? 0) - (c.fee_cents ?? 0) - (c.processing_fee_cents ?? 0),
      status: c.status === 'succeeded' ? 'paid' : c.status,
      paid: c.status === 'succeeded',
    })),
  ].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));

  // Stats and table read the same rows over the same window, so the summary
  // can't contradict the list directly below it.
  const lifetimeNet = (payouts ?? []).reduce((s, p) => s + (p.net_cents ?? 0), 0);
  const pending = (payouts ?? []).filter((p) => p.status === 'pending').reduce((s, p) => s + (p.net_cents ?? 0), 0);
  const windowGross = recent.filter((r) => r.paid).reduce((s, r) => s + r.gross, 0);
  const windowWashCount = recent.length;

  return (
    <>
      <PageHeader eyebrow={op.name} title="Earnings & payouts" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-8">
        <Stat label="Lifetime net" value={money(lifetimeNet)} />
        <Stat label="Pending payout" value={money(pending)} />
        <Stat label="Gross (last 30 days)" value={money(windowGross)} />
        <Stat label="Washes (last 30 days)" value={String(windowWashCount)} />
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
            {recent.map((r) => (
              <tr key={r.id} className="border-t border-white/5">
                <td className="px-4 py-3">{r.date ? dateShort(r.date) : '—'}</td>
                <td className="px-4 py-3">{r.building}</td>
                <td className="px-4 py-3 text-xs text-ink-400">{r.resident ?? '—'}</td>
                <td className="px-4 py-3 text-right">{money(r.gross)}</td>
                <td className="px-4 py-3 text-right text-ink-400">{money(r.fee)}</td>
                <td className={`px-4 py-3 text-right ${r.paid ? 'text-gleam' : 'text-ink-400'}`}>{money(r.net)}</td>
                <td className="px-4 py-3"><span className={`chip ${r.paid ? '' : 'text-amber-600'}`}>{r.status}</span></td>
              </tr>
            ))}
            {!recent.length && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-ink-400">No washes in the last 30 days.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="-mt-6 mb-8 text-xs text-ink-400">
        Fees are Lavo&rsquo;s 10% plus card processing (2.9% + 30¢ per payment), taken off the top before
        the rest transfers to your Stripe account.
      </p>

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
