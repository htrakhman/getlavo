import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Logo } from '@/components/Logo';
import { getSessionUser } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logScanEvent } from '@/lib/qr-attribution';
import { BuildingAttributor } from './BuildingAttributor';
import { HeroCta } from './HeroCta';
import { SwitchBuildingConfirm } from './SwitchBuildingConfirm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Lavo — Your car, washed while it’s parked',
  description: 'Book a car wash or detail that happens right in your building’s garage.',
  robots: { index: false },
};

const STEPS = [
  {
    title: 'Book in the app',
    body: 'Pick a wash or detail and a time that works. Takes under a minute.',
  },
  {
    title: 'Leave your car parked',
    body: 'No driving anywhere, no waiting around. Your car stays right in its spot.',
  },
  {
    title: 'Come back to it clean',
    body: 'We send you photos the moment it’s done.',
  },
];

const TRUST = [
  'Approved by your building’s management',
  'Insured, vetted professionals',
  'Interior, exterior & full-detail options',
  'Secure in-app payment',
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
      <main className="min-h-screen bg-[#050508] text-white">
        <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-8">
          <Logo />
          <div className="mt-20 rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center">
            <h1 className="text-2xl font-semibold">We couldn’t find that building</h1>
            <p className="mt-3 text-sm leading-relaxed text-white/60">
              This link doesn’t match an active Lavo building. Double-check the QR code with your
              property manager — or create an account and pick your building from the list.
            </p>
            <a
              href="/signup?role=resident"
              className="mt-6 block w-full rounded-2xl bg-gradient-to-r from-[#D93EA0] via-[#8B35C9] to-[#2B7CE8] px-6 py-4 text-base font-semibold text-white"
            >
              Sign up for Lavo
            </a>
            <a href="/login" className="mt-4 block text-sm text-white/60 underline underline-offset-4">
              Already have an account? Sign in
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

  const signupHref = `/signup?role=resident&b=${encodeURIComponent(slug)}&redirect=${encodeURIComponent(scheduleUrl)}`;
  const loginHref = `/login?b=${encodeURIComponent(slug)}&redirect=${encodeURIComponent(scheduleUrl)}`;

  return (
    <main className="min-h-screen bg-[#050508] text-white">
      <BuildingAttributor slug={slug} />

      {/* soft brand glow behind the hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px]"
        style={{
          background:
            'radial-gradient(70% 60% at 50% 0%, rgba(139,53,201,0.28) 0%, rgba(43,124,232,0.12) 55%, rgba(5,5,8,0) 100%)',
        }}
      />

      <div className="relative mx-auto max-w-md px-6 pb-28 pt-6 sm:max-w-lg">
        <header className="flex items-center justify-between">
          <Logo size="sm" />
          <a href={loginHref} className="text-sm font-medium text-white/70 transition hover:text-white">
            Sign in
          </a>
        </header>

        {mismatchResident ? (
          <div className="mt-16">
            <div className="mb-6 inline-flex items-center rounded-full border border-white/15 bg-white/[0.06] px-4 py-1.5 text-xs font-medium tracking-wide text-white/80">
              For residents of {building.name}
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
            <section className="mt-12">
              <div className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.06] px-4 py-1.5 text-xs font-medium tracking-wide text-white/80">
                For residents of {building.name}
              </div>
              <h1 className="mt-5 text-[2.5rem] font-semibold leading-[1.08] tracking-tight">
                Your car, washed{' '}
                <span className="bg-gradient-to-r from-[#D93EA0] via-[#8B35C9] to-[#2B7CE8] bg-clip-text text-transparent">
                  while it’s parked.
                </span>
              </h1>
              <p className="mt-4 text-base leading-relaxed text-white/65">
                Book a wash or full detail that happens right in your garage. No driving anywhere,
                no waiting in line — your car never leaves its spot.
              </p>
              <div className="mt-8">
                <HeroCta href={signupHref} label="Book a wash" buildingName={building.name} />
              </div>
              <p className="mt-3 text-center text-xs text-white/40">
                Free to join · pay per wash in the app
              </p>
            </section>

            {/* How it works */}
            <section className="mt-14">
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
                How it works
              </h2>
              <ol className="mt-5 space-y-4">
                {STEPS.map((step, i) => (
                  <li key={step.title} className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#D93EA0] to-[#2B7CE8] text-sm font-bold">
                      {i + 1}
                    </span>
                    <div>
                      <div className="font-semibold">{step.title}</div>
                      <p className="mt-1 text-sm leading-relaxed text-white/60">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            {/* Trust */}
            <section className="mt-12 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <ul className="space-y-3">
                {TRUST.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-white/80">
                    <svg
                      className="h-5 w-5 shrink-0"
                      viewBox="0 0 20 20"
                      fill="none"
                      aria-hidden
                    >
                      <circle cx="10" cy="10" r="9" stroke="url(#lavo-check-grad)" strokeWidth="1.5" />
                      <path
                        d="M6 10.2l2.6 2.6L14 7.5"
                        stroke="url(#lavo-check-grad)"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <defs>
                        <linearGradient id="lavo-check-grad" x1="0" y1="0" x2="20" y2="20">
                          <stop offset="0%" stopColor="#D93EA0" />
                          <stop offset="100%" stopColor="#2B7CE8" />
                        </linearGradient>
                      </defs>
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <footer className="mt-12 text-center text-xs text-white/35">
              {[building.address_line1, building.city, building.region].filter(Boolean).join(', ')}
              <div className="mt-2">
                Already a member?{' '}
                <a href={loginHref} className="text-white/60 underline underline-offset-4">
                  Sign in
                </a>
              </div>
            </footer>
          </>
        )}
      </div>
    </main>
  );
}
