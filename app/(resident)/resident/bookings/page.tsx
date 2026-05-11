import { PageHeader } from '@/components/PortalShell';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { dateShort, money } from '@/lib/format';
import { redirect } from 'next/navigation';
import Link from 'next/link';

const STATUS_LABEL: Record<string, string> = {
  pending_payment: 'Pending payment',
  confirmed: 'Confirmed',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const STATUS_COLOR: Record<string, string> = {
  pending_payment: 'text-yellow-300',
  confirmed: 'text-gleam',
  in_progress: 'text-blue-300',
  completed: 'text-ink-400',
  cancelled: 'text-red-400',
};

export default async function ResidentBookings() {
  const session = await getSessionUser();
  if (!session) redirect('/login');

  const sb = supabaseServer();

  const { data: resident } = await sb
    .from('residents')
    .select('id')
    .eq('profile_id', session.user.id)
    .single();
  if (!resident) redirect('/resident/onboarding');

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: upcoming }, { data: past }] = await Promise.all([
    sb.from('bookings')
      .select('id, scheduled_for, time_slot, status, gross_cents, booking_type, operator:operators(name)')
      .eq('resident_id', resident.id)
      .gte('scheduled_for', today)
      .in('status', ['confirmed', 'in_progress', 'pending_payment'])
      .order('scheduled_for'),
    sb.from('bookings')
      .select('id, scheduled_for, time_slot, status, gross_cents, booking_type, operator:operators(name)')
      .eq('resident_id', resident.id)
      .or(`scheduled_for.lt.${today},status.in.(completed,cancelled)`)
      .order('scheduled_for', { ascending: false })
      .limit(10),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Resident portal"
        title="My bookings"
        action={<Link href="/resident/book" className="btn-primary">Book a wash</Link>}
      />

      <div className="space-y-8">
        <div>
          <h3 className="font-display text-xl mb-3">Upcoming</h3>
          {upcoming?.length ? (
            <div className="space-y-3">
              {upcoming.map((b: any) => (
                <div key={b.id} className="card p-5 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{b.operator?.name}</div>
                    <div className="mt-0.5 text-sm text-ink-400">
                      {dateShort(b.scheduled_for)}{b.time_slot ? ` at ${b.time_slot}` : ''}
                      <span className="ml-2 text-xs">
                        {b.booking_type === 'building_day' ? '· Building day' : '· On-demand'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-medium ${STATUS_COLOR[b.status] ?? 'text-ink-300'}`}>
                      {STATUS_LABEL[b.status] ?? b.status}
                    </div>
                    <div className="mt-0.5 text-xs text-ink-400">{money(b.gross_cents)}</div>
                  </div>
                </div>
              ))}
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
