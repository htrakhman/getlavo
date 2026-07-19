import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { googleCalendarUrl } from '@/lib/ics';
import { Logo } from '@/components/Logo';

export const dynamic = 'force-dynamic';

/**
 * Scheduling step for the building QR funnel (`/schedule?b={slug}`).
 *
 * Routes a signed-in resident toward booking with their building's assigned
 * operator; anyone not ready yet is sent to the step that gets them there
 * (login → onboarding → confirm-switch). When a slot was picked on the
 * landing calendar (`date` + `time`), this renders the date-confirmation
 * step — add-to-calendar via Google/Apple, then continue to payment.
 */
export default async function SchedulePage({
  searchParams,
}: {
  searchParams: { b?: string; date?: string; time?: string };
}) {
  const slug = (searchParams.b ?? '').trim();
  if (!slug) redirect('/resident/book');

  // Optional preselected slot from the landing-page calendar.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date ?? '') ? searchParams.date! : null;
  const time = /^\d{1,2}:\d{2} (AM|PM)$/.test(searchParams.time ?? '') ? searchParams.time! : null;
  const slotQs = `${date ? `&date=${encodeURIComponent(date)}` : ''}${time ? `&time=${encodeURIComponent(time)}` : ''}`;

  const self = `/schedule?b=${encodeURIComponent(slug)}${slotQs}`;
  const session = await getSessionUser();
  if (!session) redirect(`/login?b=${encodeURIComponent(slug)}&redirect=${encodeURIComponent(self)}`);

  const admin = supabaseAdmin();
  const { data: building } = await admin
    .from('buildings')
    .select('id, name, address_line1, city, region')
    .eq('slug', slug)
    .in('status', ['prospect', 'pilot', 'active'])
    .maybeSingle();
  if (!building) redirect('/resident/book');

  const { data: resident } = await admin
    .from('residents')
    .select('id, building_id')
    .eq('profile_id', session.user.id)
    .maybeSingle();

  if (!resident) {
    redirect(`/resident/onboarding?b=${encodeURIComponent(slug)}&redirect=${encodeURIComponent(self)}`);
  }
  if (resident.building_id !== building.id) {
    // /b/[slug] renders the confirm-switch prompt for this case.
    redirect(`/b/${encodeURIComponent(slug)}`);
  }

  const { data: partnership } = await admin
    .from('partnerships')
    .select('id, operator:operators(id, status, stripe_onboarding_complete)')
    .eq('building_id', building.id)
    .eq('status', 'active')
    .maybeSingle();

  const operator = (partnership?.operator as any) ?? null;
  const bookable = operator && operator.status === 'approved' && operator.stripe_onboarding_complete;
  const paymentHref = bookable
    ? `/resident/book/${operator.id}?partnershipId=${partnership!.id}${slotQs}`
    : '/resident/book';

  // No slot picked → skip the confirmation step and go straight to booking.
  if (!date || !time) redirect(paymentHref);

  const longDate = new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const event = {
    uid: `lavo-${slug}-${date}@getlavo.io`,
    title: 'Lavo car wash',
    description: `Your car wash at ${building.name}. Drop your keys at the front desk before your appointment.`,
    location: [building.address_line1, building.city, building.region].filter(Boolean).join(', '),
    date,
    time,
  };
  const googleHref = googleCalendarUrl(event);
  const icsHref = `/api/schedule/ics?b=${encodeURIComponent(slug)}&date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}`;

  return (
    <main className="relative min-h-screen">
      <div className="absolute inset-x-0 top-0 h-[420px] bg-gleam-fade" />
      <div className="relative mx-auto max-w-md px-6 py-8">
        <Logo size="sm" />

        <div className="card mt-12 p-6 text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.25em] text-gleam">
            Your wash is scheduled for
          </div>
          <div className="mt-3 font-display text-2xl font-bold tracking-tight">{longDate}</div>
          <div className="mt-1 font-display text-xl text-gleam">{time}</div>
          <div className="mt-3 text-sm text-ink-300">{building.name}</div>
          <p className="mt-1 text-xs text-ink-400">
            {[building.address_line1, building.city].filter(Boolean).join(', ')}
          </p>

          <div className="mt-6 border-t border-white/10 pt-5">
            <div className="text-xs font-semibold uppercase tracking-widest text-ink-400">
              Add it to your calendar
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <a href={googleHref} target="_blank" rel="noopener noreferrer" className="btn-ghost w-full py-2.5 text-sm">
                Google
              </a>
              <a href={icsHref} className="btn-ghost w-full py-2.5 text-sm">
                Apple / Outlook
              </a>
            </div>
          </div>

          <div className="mt-6 border-t border-white/10 pt-5">
            <a href={paymentHref} className="btn-primary w-full py-3.5 text-base">
              Continue to payment
            </a>
            <p className="mt-3 text-xs text-ink-500">
              Remember to drop your keys at the front desk before your appointment.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
