import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Logo } from '@/components/Logo';
import { getSessionUser } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logScanEvent } from '@/lib/qr-attribution';
import { BuildingAttributor } from './BuildingAttributor';
import { SwitchBuildingConfirm } from './SwitchBuildingConfirm';
import { AvailabilityCalendar } from './AvailabilityCalendar';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Lavo — Your car, washed while it’s parked',
  description: 'Book a car wash or detail that happens right in your building’s garage.',
  robots: { index: false },
};

const STEPS = [
  {
    title: 'Book online',
    body: 'Pick a wash or detail and a time that works. Takes under a minute.',
  },
  {
    title: 'Drop your keys at the front desk',
    body: 'Before your scheduled appointment, leave your keys with the front desk so the crew can access your car.',
  },
  {
    title: 'Leave your car parked',
    body: 'No driving anywhere, no waiting around. The crew comes to your building’s garage.',
  },
  {
    title: 'Pick up your keys, come back to it clean',
    body: 'Grab your keys from the front desk — we send you photos the moment it’s done.',
  },
];

const TRUST = [
  'Approved by your building’s management',
  'Insured, vetted professionals',
  'Interior, exterior & full-detail options',
  'Secure online payment',
];

// QR-code landing for building partners. Everything here is Lavo-branded —
// the assigned operator is intentionally never shown on this page.
export default async function QrBuildingLanding({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  const admin = supabaseAdmin();

  const { data: building } = await admin
    .from('buildings')
    .select('id, name, slug, address_line1, city, region')
    .eq('slug', slug)
    .in('status', ['prospect', 'pilot', 'active'])
    .maybeSingle();

  const h = headers();
  await logScanEvent({
    slug,
    event: 'page_view',
    buildingId: building?.id ?? null,
    userAgent: h.get('user-agent'),
    referrer: h.get('referer'),
  });

  if (!building) {
    return (
      <main className="relative min-h-screen">
        <div className="absolute inset-x-0 top-0 h-[420px] bg-gleam-fade" />
        <div className="relative mx-auto flex min-h-screen max-w-md flex-col px-6 py-8">
          <Logo />
          <div className="card mt-20 p-8 text-center">
            <h1 className="font-display text-2xl font-bold tracking-tight">We couldn’t find that building</h1>
            <p className="mt-3 text-sm leading-relaxed text-ink-300">
              This link doesn’t match an active Lavo building. Double-check the QR code with your
              property manager — or create an account and pick your building from the list.
            </p>
            <a href="/signup?role=resident" className="btn-primary mt-6 w-full py-3.5 text-base">
              Sign up for Lavo
            </a>
            <a href="/login" className="btn-quiet mt-3 w-full">
              Already have an account? Login
            </a>
          </div>
        </div>
      </main>
    );
  }

  const scheduleUrl = `/schedule?b=${encodeURIComponent(slug)}`;
  const session = await getSessionUser();

  let mismatchResident: { currentBuildingName: string | null } | null = null;

  if (session) {
    const { data: resident } = await admin
      .from('residents')
      .select('id, building_id, building:buildings(name)')
      .eq('profile_id', session.user.id)
      .maybeSingle();

    if (resident?.building_id === building.id) {
      // Already registered here — skip the landing page entirely.
      redirect(scheduleUrl);
    }
    if (resident) {
      mismatchResident = { currentBuildingName: (resident.building as any)?.name ?? null };
    } else {
      // Signed in but not yet a resident anywhere: attach them to this
      // building via onboarding, then continue to scheduling.
      redirect(
        `/resident/onboarding?b=${encodeURIComponent(slug)}&redirect=${encodeURIComponent(scheduleUrl)}`
      );
    }
  }

  const loginHref = `/login?b=${encodeURIComponent(slug)}&redirect=${encodeURIComponent(scheduleUrl)}`;

  return (
    <main className="relative min-h-screen">
      <BuildingAttributor slug={slug} />
      <div className="absolute inset-x-0 top-0 h-[520px] bg-gleam-fade" />

      <div className="relative mx-auto max-w-md px-6 pb-28 pt-6 sm:max-w-xl">
        <header className="flex items-center justify-between">
          <Logo size="sm" />
          <a href={loginHref} className="btn-quiet text-sm">
            Login
          </a>
        </header>

        {mismatchResident ? (
          <div className="mt-16">
            <div className="mb-6">
              <div className="text-xs font-semibold uppercase tracking-[0.25em] text-gleam">
                For residents of
              </div>
              <div className="mt-1 font-display text-2xl font-bold tracking-tight">{building.name}</div>
            </div>
            <SwitchBuildingConfirm
              slug={slug}
              buildingName={building.name}
              currentBuildingName={mismatchResident.currentBuildingName}
            />
          </div>
        ) : (
          <>
            {/* Hero */}
            <section className="mt-12 text-center">
              <div className="text-xs font-semibold uppercase tracking-[0.25em] text-gleam">
                For residents of
              </div>
              <div className="mt-1.5 font-display text-2xl font-bold tracking-tight sm:text-3xl">
                {building.name}
              </div>
              <h1 className="mt-6 font-display text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl">
                Your car, washed
                <br />
                <span className="gleam-text">while it’s parked.</span>
              </h1>
              <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-ink-300">
                Book a wash or full detail that happens right in your building’s garage. No driving
                anywhere, no waiting in line — the crew comes to you.
              </p>
              <p className="mt-3 text-xs text-ink-400">Free to join · pay per wash online</p>
            </section>

            {/* Live availability */}
            <section id="pick-a-time" className="mt-8 scroll-mt-6">
              <AvailabilityCalendar slug={slug} />
            </section>

            {/* How it works */}
            <section className="mt-14">
              <div className="mb-5 flex items-center gap-5">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-ink-600" />
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-400">
                  How it works
                </span>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-ink-600" />
              </div>
              <ol className="space-y-3">
                {STEPS.map((step, i) => (
                  <li key={step.title} className="card flex gap-4 p-5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gleam/10 font-display text-sm font-bold text-gleam">
                      {i + 1}
                    </span>
                    <div className="text-left">
                      <div className="font-display text-lg">{step.title}</div>
                      <p className="mt-1 text-sm leading-relaxed text-ink-300">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            {/* Trust */}
            <section className="card mt-10 p-6">
              <div className="text-xs font-semibold uppercase tracking-widest text-gleam">Trust</div>
              <ul className="mt-4 space-y-3 text-sm text-ink-200">
                {TRUST.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gleam" aria-hidden />
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <footer className="mt-12 text-center text-xs text-ink-400">
              {[building.address_line1, building.city, building.region].filter(Boolean).join(', ')}
              <div className="mt-2">
                Already a member?{' '}
                <a href={loginHref} className="font-medium text-gleam hover:text-gleam-300">
                  Login
                </a>
              </div>
            </footer>
          </>
        )}
      </div>
    </main>
  );
}
