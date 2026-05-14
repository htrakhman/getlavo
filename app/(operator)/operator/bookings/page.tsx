import { PageHeader } from '@/components/PortalShell';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { dateShort, money } from '@/lib/format';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PartnershipRequests } from './PartnershipRequests';

const STATUS_LABEL: Record<string, string> = {
  pending_payment: 'Awaiting payment',
  confirmed: 'Confirmed',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default async function OperatorBookings() {
  const session = await getSessionUser();
  if (!session) redirect('/login');

  const sb = supabaseServer();

  const { data: op } = await sb.from('operators').select('id, stripe_onboarding_complete').limit(1).maybeSingle();
  if (!op) redirect('/operator/onboarding');

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: pendingPartnerships }, { data: upcoming }, { data: past }] = await Promise.all([
    sb.from('partnerships')
      .select('id, created_at, building:buildings(id, name, city, address_line1)')
      .eq('operator_id', op.id)
      .eq('status', 'pending')
      .order('created_at'),
    sb.from('bookings')
      .select('id, scheduled_for, time_slot, status, gross_cents, net_cents, booking_type, resident:residents(profile:profiles(full_name)), vehicle:vehicles(make, model, color, license_plate), building:buildings(name)')
      .eq('operator_id', op.id)
      .gte('scheduled_for', today)
      .in('status', ['confirmed', 'in_progress', 'pending_payment'])
      .order('scheduled_for'),
    sb.from('bookings')
      .select('id, scheduled_for, time_slot, status, gross_cents, net_cents, booking_type, resident:residents(profile:profiles(full_name)), vehicle:vehicles(make, model, color, license_plate), building:buildings(name)')
      .eq('operator_id', op.id)
      .or(`scheduled_for.lt.${today},status.in.(completed,cancelled)`)
      .order('scheduled_for', { ascending: false })
      .limit(20),
  ]);

  return (
    <>
      <PageHeader eyebrow="Operator portal" title="Bookings" />

      {!op.stripe_onboarding_complete && (
        <div className="mb-6 card border-yellow-400/30 bg-yellow-400/5 p-5 flex items-center justify-between gap-4">
          <div>
            <div className="font-medium text-yellow-200">Connect your bank account</div>
            <p className="mt-0.5 text-sm text-yellow-300/70">You must connect Stripe before residents can book with you.</p>
          </div>
          <a href="/api/stripe/connect/onboard" className="btn-primary shrink-0">Connect →</a>
        </div>
      )}

      {pendingPartnerships && pendingPartnerships.length > 0 && (
        <PartnershipRequests requests={pendingPartnerships as any[]} />
      )}

      <div className="space-y-8 mt-6">
        <div>
          <h3 className="font-display text-xl mb-3">Upcoming</h3>
          {upcoming?.length ? (
            <div className="space-y-3">
              {upcoming.map((b: any) => {
                const resident = b.resident?.profile;
                const vehicle = b.vehicle;
                return (
                  <div key={b.id} className="card p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-medium">{b.building?.name}</div>
                        <div className="mt-0.5 text-sm text-ink-300">
                          {resident?.full_name} · {vehicle?.color} {vehicle?.make} {vehicle?.model}
                        </div>
                        <div className="mt-0.5 text-xs text-ink-400 font-mono">{vehicle?.license_plate}</div>
                        <div className="mt-1 text-sm text-ink-400">
                          {dateShort(b.scheduled_for)}{b.time_slot ? ` at ${b.time_slot}` : ''}
                          <span className="ml-2 text-xs">
                            {b.booking_type === 'building_day' ? '· Building day' : '· On-demand'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs text-ink-400">Your payout</div>
                        <div className="font-display text-xl text-gleam">{money(b.net_cents)}</div>
                        <div className="mt-0.5 text-xs text-ink-500">of {money(b.gross_cents)}</div>
                        <div className={`mt-1 text-xs font-medium ${b.status === 'confirmed' ? 'text-gleam' : 'text-yellow-300'}`}>
                          {STATUS_LABEL[b.status] ?? b.status}
                        </div>
                        <Link href={`/operator/bookings/${b.id}`} className="mt-2 inline-block text-xs text-gleam hover:underline">
                          Photos & complete →
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card p-6 text-center text-sm text-ink-400">No upcoming bookings.</div>
          )}
        </div>

        {past && past.length > 0 && (
          <div>
            <h3 className="font-display text-xl mb-3">Past bookings</h3>
            <div className="space-y-2">
              {past.map((b: any) => {
                const resident = b.resident?.profile;
                const vehicle = b.vehicle;
                return (
                  <div key={b.id} className="card p-4 flex items-center justify-between opacity-70">
                    <div>
                      <div className="text-sm font-medium">{b.building?.name} · {resident?.full_name}</div>
                      <div className="text-xs text-ink-400">
                        {dateShort(b.scheduled_for)} · {vehicle?.color} {vehicle?.make} {vehicle?.model}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">{money(b.net_cents)}</div>
                      <div className="text-xs text-ink-500">{STATUS_LABEL[b.status] ?? b.status}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
