import { PageHeader } from '@/components/PortalShell';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { dateShort, money } from '@/lib/format';

export default async function ChargesPage() {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  const sb = supabaseServer();

  const { data: resident } = await sb
    .from('residents')
    .select('id')
    .eq('profile_id', session.user.id)
    .maybeSingle();
  if (!resident) redirect('/resident/onboarding');

  const { data: bookings } = await sb
    .from('bookings')
    .select('id, scheduled_for, gross_cents, status, paid_at, stripe_payment_intent_id, building:buildings(name), operator:operators(name)')
    .eq('resident_id', resident.id)
    .order('scheduled_for', { ascending: false })
    .limit(100);

  const total = (bookings ?? []).filter((b: any) => b.paid_at).reduce((s, b: any) => s + (b.gross_cents ?? 0), 0);

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
            {(bookings ?? []).map((b: any) => (
              <tr key={b.id} className="border-t border-white/5">
                <td className="px-4 py-3">{dateShort(b.scheduled_for)}</td>
                <td className="px-4 py-3 text-ink-300">{b.building?.name}</td>
                <td className="px-4 py-3 text-ink-400 text-xs">{b.operator?.name}</td>
                <td className="px-4 py-3 text-right">{money(b.gross_cents)}</td>
                <td className="px-4 py-3">
                  <span className={`chip ${b.status === 'completed' || b.paid_at ? 'text-gleam' : ''}`}>
                    {b.paid_at ? 'paid' : b.status}
                  </span>
                </td>
              </tr>
            ))}
            {!bookings?.length && (
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
