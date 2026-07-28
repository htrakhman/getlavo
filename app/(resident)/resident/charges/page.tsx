import { PageHeader } from '@/components/PortalShell';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { dateShort, money } from '@/lib/format';

export default async function ChargesPage() {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  const sb = supabaseServer();

  const admin = supabaseAdmin();
  const { data: resident } = await admin
    .from('residents')
    .select('id')
    .eq('profile_id', session.user.id)
    .maybeSingle();
  if (!resident) redirect('/resident/onboarding');

  const [{ data: bookings }, { data: washCharges }] = await Promise.all([
    sb
      .from('bookings')
      .select('id, scheduled_for, gross_cents, status, paid_at, stripe_payment_intent_id, building:buildings(name), operator:operators(name)')
      .eq('resident_id', resident.id)
      .order('scheduled_for', { ascending: false })
      .limit(100),
    // Admin client scoped to this resident — same RLS-silent-failure caution as
    // the other resident pages.
    admin
      .from('charges')
      .select('id, created_at, amount_cents, status, failure_reason, booking_id, operator:operators(name), wash_day:wash_days(scheduled_for, building:buildings(name))')
      .eq('resident_id', resident.id)
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  // A charge that mirrors a prepaid booking is the same money as the booking
  // row — show the ledger entry and drop the booking so it isn't listed twice.
  const chargedBookingIds = new Set(
    (washCharges ?? []).map((c: any) => c.booking_id).filter(Boolean)
  );

  // One list: resident-booked washes (bookings) + wash-day service charges.
  const rows = [
    ...(bookings ?? [])
      .filter((b: any) => !chargedBookingIds.has(b.id))
      .map((b: any) => {
        // "Paid" means money actually moved: a payment intent (or a booking
        // that cost nothing). A booking row by itself — even a confirmed one —
        // is not evidence of payment, and must never be shown as though it is.
        const paid = !!b.paid_at && (!!b.stripe_payment_intent_id || (b.gross_cents ?? 0) <= 0);
        return {
          id: `b-${b.id}`,
          date: b.scheduled_for,
          building: b.building?.name,
          operator: b.operator?.name,
          amount: b.gross_cents,
          status: paid ? 'paid' : b.status === 'confirmed' ? 'payment pending' : b.status,
          paid,
          note: null as string | null,
        };
      }),
    ...(washCharges ?? []).map((c: any) => ({
      id: `c-${c.id}`,
      date: c.wash_day?.scheduled_for ?? c.created_at?.slice(0, 10),
      building: c.wash_day?.building?.name,
      operator: c.operator?.name,
      amount: c.amount_cents,
      status: c.status === 'succeeded' ? 'paid' : c.status,
      paid: c.status === 'succeeded',
      note: c.status === 'failed' ? c.failure_reason : null,
    })),
  ].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));

  const total = rows.filter((r) => r.paid).reduce((s, r) => s + (r.amount ?? 0), 0);

  return (
    <>
      <PageHeader eyebrow="Account" title="Charges" />

      <div className="card mb-6 p-5">
        <div className="text-xs uppercase tracking-widest text-ink-300">Lifetime</div>
        <div className="mt-1 font-display text-3xl">{money(total)}</div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-widest text-ink-400">
            <tr>
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-left">Building</th>
              <th className="px-4 py-2 text-left">Operator</th>
              <th className="px-4 py-2 text-right">Amount</th>
              <th className="px-4 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-white/5">
                <td className="px-4 py-3">{r.date ? dateShort(r.date) : '—'}</td>
                <td className="px-4 py-3 text-ink-300">{r.building}</td>
                <td className="px-4 py-3 text-ink-400 text-xs">{r.operator}</td>
                <td className="px-4 py-3 text-right">{money(r.amount ?? 0)}</td>
                <td className="px-4 py-3">
                  <span className={`chip ${r.paid ? 'text-gleam' : r.status === 'failed' ? 'text-amber-600' : ''}`}>
                    {r.status}
                  </span>
                  {r.note && <div className="mt-1 text-[10px] text-amber-600">{r.note}</div>}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-ink-400">No charges yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-ink-500">
        Need a copy of a receipt? Email hello@getlavo.io with the date and we'll send one over.
      </p>
    </>
  );
}
