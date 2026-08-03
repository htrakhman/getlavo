import { PageHeader } from '@/components/PortalShell';
import { getSessionUser } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { verifyAndConfirmBookingPayment } from '@/lib/booking-verify';
import { dateShort, money } from '@/lib/format';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { BookingActions } from './BookingActions';
import { CANCELLATION_POLICY_LINE } from '@/lib/cancellation-policy';

const STATUS_LABEL: Record<string, string> = {
  pending_payment: 'Pending payment',
  confirmed: 'Confirmed',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const STATUS_COLOR: Record<string, string> = {
  pending_payment: 'text-amber-600',
  confirmed: 'text-gleam',
  in_progress: 'text-blue-600',
  completed: 'text-ink-400',
  cancelled: 'text-red-400',
};

/** Add-ons the resident actually paid for on a booking — the total includes them. */
function addonLabels(booking: any): string[] {
  return (booking.addon_orders ?? [])
    .filter((a: any) => a.paid_at)
    .map((a: any) => a.operator_addon?.label)
    .filter(Boolean);
}

export default async function ResidentBookings({
  searchParams,
}: {
  searchParams: { booking?: string; success?: string };
}) {
  const session = await getSessionUser();
  if (!session) redirect('/login');

  // Admin client throughout: table grants for the authenticated role are
  // unreliable on tables created after 0002_grants (see migration 0033), so
  // RLS-scoped reads can silently return nothing. All queries stay scoped to
  // this user's own resident row.
  const admin = supabaseAdmin();

  const { data: resident } = await admin
    .from('residents')
    .select('id')
    .eq('profile_id', session.user.id)
    .maybeSingle();
  if (!resident) redirect('/resident/onboarding');

  // Fallback for missed webhooks: on the Stripe success redirect, verify the
  // payment directly with Stripe and confirm the booking before rendering.
  let paymentBanner: 'confirmed' | 'processing' | null = null;
  if (searchParams.booking && searchParams.success === '1') {
    const result = await verifyAndConfirmBookingPayment(admin, searchParams.booking).catch(
      () => null,
    );
    paymentBanner = result?.confirmed ? 'confirmed' : 'processing';
  }

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: upcoming, error: upcomingError }, { data: past }] = await Promise.all([
    admin.from('bookings')
      .select('id, scheduled_for, time_slot, status, gross_cents, booking_type, operator_id, operator:operators(name), package:service_packages(name), addon_orders(id, paid_at, operator_addon:operator_addons(label))')
      .eq('resident_id', resident.id)
      .gte('scheduled_for', today)
      .in('status', ['confirmed', 'in_progress', 'pending_payment'])
      .order('scheduled_for'),
    admin.from('bookings')
      .select('id, scheduled_for, time_slot, status, gross_cents, booking_type, operator:operators(name), package:service_packages(name), addon_orders(id, paid_at, operator_addon:operator_addons(label))')
      .eq('resident_id', resident.id)
      .or(`scheduled_for.lt.${today},status.in.(completed,cancelled)`)
      .order('scheduled_for', { ascending: false })
      .limit(10),
  ]);
  if (upcomingError) {
    console.error('[resident/bookings] upcoming query failed', { message: upcomingError.message });
  }

  return (
    <>
      <PageHeader
        eyebrow="Resident portal"
        title="My bookings"
        action={<Link href="/resident/book" className="btn-primary">Book a wash</Link>}
      />

      {paymentBanner === 'confirmed' && (
        <div className="mb-6 card border-gleam/30 bg-gleam/5 p-4">
          <p className="text-sm font-medium text-gleam">Payment received — your booking is confirmed.</p>
          <p className="mt-2 text-sm text-ink-200">
            A calendar invite is on its way to your email. Before your wash window,{' '}
            <strong>drop your keys at the front desk</strong> — if the crew can&apos;t get your keys
            they can&apos;t wash the car, and the booking isn&apos;t refunded.
          </p>
          <p className="mt-2 text-sm text-ink-300">
            {CANCELLATION_POLICY_LINE}{' '}
            <Link href="/legal/terms" className="underline underline-offset-2 hover:text-gleam">
              Read the policy
            </Link>
            .
          </p>
        </div>
      )}
      {paymentBanner === 'processing' && (
        <div className="mb-6 card border-yellow-400/30 bg-yellow-400/5 p-4 text-sm text-amber-700">
          Your payment is still processing. This page will show the booking as confirmed once
          Stripe finishes — refresh in a moment.
        </div>
      )}

      <div className="space-y-8">
        <div>
          <h3 className="font-display text-xl mb-3">Upcoming</h3>
          {upcoming?.length ? (
            <div className="space-y-3">
              {upcoming.map((b: any) => (
                <div key={b.id} className="card p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-medium">
                        {b.operator?.name}
                        {b.package?.name && <span className="text-ink-400"> · {b.package.name}</span>}
                      </div>
                      <div className="mt-0.5 text-sm text-ink-400">
                        {dateShort(b.scheduled_for)}{b.time_slot ? ` at ${b.time_slot}` : ''}
                        <span className="ml-2 text-xs">
                          {b.booking_type === 'building_day' ? '· Building day' : '· On-demand'}
                        </span>
                      </div>
                      {addonLabels(b).length > 0 && (
                        <div className="mt-1 text-xs text-gleam">Add-ons: {addonLabels(b).join(', ')}</div>
                      )}
                      <div className="mt-2 text-xs text-ink-400">
                        Keys to the front desk before your window ·{' '}
                        <a href={`/api/bookings/${b.id}/calendar`} className="underline hover:text-gleam">
                          Add to calendar
                        </a>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className={`text-sm font-medium ${STATUS_COLOR[b.status] ?? 'text-ink-300'}`}>
                        {STATUS_LABEL[b.status] ?? b.status}
                      </div>
                      <div className="mt-0.5 text-xs text-ink-400">{money(b.gross_cents)}</div>
                    </div>
                  </div>
                  <BookingActions
                    bookingId={b.id}
                    operatorId={b.operator_id}
                    scheduledFor={b.scheduled_for}
                    timeSlot={b.time_slot}
                  />
                </div>
              ))}
              <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
                <div>
                  <div className="font-medium">Need another wash?</div>
                  <p className="mt-0.5 text-sm text-ink-400">
                    Book an additional wash for a future date — your upcoming ones stay as they are.
                  </p>
                </div>
                <Link href="/resident/book" className="btn-primary shrink-0">Book another wash</Link>
              </div>
            </div>
          ) : (
            <div className="card p-6 text-center">
              <p className="text-sm text-ink-400">No upcoming bookings.</p>
              <Link href="/resident/book" className="btn-primary mt-4 inline-block">Book a wash →</Link>
            </div>
          )}
        </div>

        {past && past.length > 0 && (
          <div>
            <h3 className="font-display text-xl mb-3">Past</h3>
            <div className="space-y-3">
              {past.map((b: any) => (
                <div key={b.id} className="card p-5 flex items-center justify-between opacity-70">
                  <div>
                    <div className="font-medium">{b.operator?.name}</div>
                    <div className="mt-0.5 text-sm text-ink-400">
                      {dateShort(b.scheduled_for)}{b.time_slot ? ` at ${b.time_slot}` : ''}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm ${STATUS_COLOR[b.status] ?? 'text-ink-300'}`}>
                      {STATUS_LABEL[b.status] ?? b.status}
                    </div>
                    <div className="mt-0.5 text-xs text-ink-400">{money(b.gross_cents)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
