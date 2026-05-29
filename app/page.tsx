import Link from 'next/link';
import { Suspense } from 'react';
import { MarketingNav, MarketingFooter } from '@/components/MarketingNav';
import { RelatedLinks } from '@/components/marketing/RelatedLinks';
import { FourStepGrid } from '@/components/marketing/how-it-works/FourStepGrid';
import { CheckBuildingFlow } from '@/components/CheckBuildingFlow';
import { JsonLd } from '@/components/seo/JsonLd';
import { organizationSchema, websiteSchema } from '@/lib/seo/schema';
import { FEATURED_CITY_SLUGS } from '@/lib/seo/keep-cities';
import { getMunicipalityBySlug } from '@/lib/seo/cities';
import { createPageMetadata } from '@/lib/seo/site';
import { getSessionUser } from '@/lib/supabase/server';
import { pickLandingPortal } from '@/lib/portal-routing';
import { redirect } from 'next/navigation';

export const metadata = createPageMetadata({
  path: '/',
  title: 'Apartment Mobile Car Wash for Residents, Buildings, and Operators | Lavo',
  description:
    'Lavo connects apartment residents, property managers, and vetted mobile car wash operators so residents can book car washes without leaving home.',
});

const HOME_RELATED = [
  { href: '/cities', label: 'Lavo cities' },
  { href: '/buildings', label: 'For properties' },
  { href: '/operators', label: 'For operators' },
  { href: '/residents', label: 'For residents' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/about', label: 'About' },
  { href: '/safety', label: 'Safety' },
  { href: '/resources/apartment-car-wash-amenity', label: 'Apartment car wash amenity' },
  { href: '/cities/new-jersey', label: 'New Jersey' },
  ...FEATURED_CITY_SLUGS.map((slug) => {
    const m = getMunicipalityBySlug(slug);
    return { href: `/cities/${slug}`, label: m?.name ?? slug };
  }),
];

export default async function Home({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  // Supabase may redirect to SITE_URL (this page) instead of /auth/callback when
  // the callback URL isn't in its allowlist. Forward the params so the session
  // gets established correctly.
  const code = typeof searchParams.code === 'string' ? searchParams.code : null;
  const tokenHash = typeof searchParams.token_hash === 'string' ? searchParams.token_hash : null;
  const type = typeof searchParams.type === 'string' ? searchParams.type : null;
  const role = typeof searchParams.role === 'string' ? searchParams.role : null;

  if (code) {
    const qs = new URLSearchParams({ code });
    if (role) qs.set('role', role);
    redirect(`/auth/callback?${qs.toString()}`);
  }

  if (tokenHash && type) {
    const qs = new URLSearchParams({ token_hash: tokenHash, type });
    if (role) qs.set('role', role);
    redirect(`/auth/confirm?${qs.toString()}`);
  }

  const session = await getSessionUser();
  if (session) {
    const portal = pickLandingPortal(session.portals, session.profile.role);
    if (portal === 'building') redirect('/building');
    if (portal === 'operator') redirect('/operator');
    if (portal === 'resident') redirect('/resident');
    if (session.profile.role === 'admin') redirect('/admin');
    redirect('/auth/pick-role');
  }
  return (
    <main className="relative">
      <JsonLd data={[organizationSchema(), websiteSchema()]} />
      <div className="absolute inset-x-0 top-0 h-[600px] bg-gleam-fade" />
      <MarketingNav />

      {/* Hero */}
      <section className="relative pt-16 pb-24 text-center px-6">
        <div className="mx-auto max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-gleam/30 bg-gleam/5 px-4 py-1.5 text-xs font-medium text-gleam mb-8">
            Mobile car wash · For apartment residents
          </div>
          <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl lg:text-7xl">
            Wash your car without<br />
            <span className="gleam-text">thinking about it.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-ink-300">
            Book from your phone. Operators are vetted and insured. Buildings pay nothing.
          </p>
          <div id="request-lavo" className="mt-10 mx-auto w-full max-w-xl scroll-mt-24 text-center">
            <p className="mb-3 text-sm font-medium text-ink-200">See if your building is on Lavo.</p>
            <Suspense fallback={<div className="text-sm text-ink-500">Loading address search…</div>}>
              <CheckBuildingFlow />
            </Suspense>
          </div>
          <div className="mt-12 border-t border-white/10 pt-10">
            <p className="text-xs uppercase tracking-[0.18em] text-ink-300 mb-5">Who are you?</p>
            <div className="mx-auto flex max-w-2xl flex-col gap-3 sm:flex-row sm:justify-center">
              <Link href="/signup?role=resident" className="w-full sm:flex-1 rounded-full border border-white/25 bg-white/5 px-5 py-3 text-center text-sm text-ink-100 transition-colors hover:border-white/40 hover:bg-white/10">
                I&apos;m a resident
              </Link>
              <Link href="/signup?role=operator" className="w-full sm:flex-1 rounded-full border border-white/25 bg-white/5 px-5 py-3 text-center text-sm text-ink-100 transition-colors hover:border-white/40 hover:bg-white/10">
                I run a wash crew
              </Link>
              <Link href="/signup?role=building_manager" className="w-full sm:flex-1 rounded-full border border-white/25 bg-white/5 px-5 py-3 text-center text-sm text-ink-100 transition-colors hover:border-white/40 hover:bg-white/10">
                I manage a property
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-5 md:grid-cols-2 md:gap-6">
          <div className="card p-7 text-left ring-1 ring-inset ring-white/[0.04] transition-colors hover:border-white/10">
            <div className="text-xs font-medium uppercase tracking-widest text-ink-500">Coverage</div>
            <p className="mt-4 font-display text-2xl text-gleam leading-tight">Nationwide</p>
            <p className="mt-4 text-sm leading-relaxed text-ink-400">
              We onboard buildings across the U.S. Search your address above—if yours is not live yet, we use it to route demand to operators in your market.
            </p>
          </div>
          <div className="card p-7 text-left ring-1 ring-inset ring-white/[0.04] transition-colors hover:border-white/10">
            <div className="text-xs font-medium uppercase tracking-widest text-ink-500">Trust</div>
            <ul className="mt-4 space-y-3 text-sm text-ink-300">
              {[
                'Background-checked operators',
                'Insured crews',
                'Photo proof on every wash',
                'Stripe secure payments',
              ].map((line) => (
                <li key={line} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gleam/70" aria-hidden />
                  <span className="leading-relaxed">{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <FourStepGrid
        className="border-t border-white/10"
        title="How it works"
        subtitle="Book from your phone. A vetted crew washes your car at your building. You get notified when it's done."
        footerHref="/how-it-works"
        footerLabel="Full guide for buildings and operators"
      />

      <section className="relative mx-auto max-w-6xl px-6 py-20 border-t border-white/10">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 items-center">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-gleam mb-3">For residents</div>
            <h2 className="font-display text-4xl font-semibold tracking-tight leading-[1.1] md:text-5xl mb-3">
              Clean car, <span className="gleam-text">zero effort</span>
            </h2>
            <p className="text-ink-400 text-sm leading-relaxed max-w-md mb-8">
              Book and pay from your phone. Operators your building already trusts, with prices shown before you confirm.
            </p>
            <ul className="space-y-5 text-sm text-ink-300">
              {[
                'Only see operators within your building\'s radius — no browsing random Yelp listings',
                'Book a building wash day slot (cheaper) or an on-demand open slot any available day',
                'Pay securely in-app. No cash, no Venmo, no awkward conversations',
                'Get a photo when your wash is done. Leave a review from your phone',
                'Add wax, interior detail, or tire shine as a one-tap upgrade',
              ].map((text) => (
                <li key={text} className="flex gap-3.5">
                  <span
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gleam/70"
                    aria-hidden
                  />
                  <span className="leading-relaxed">{text}</span>
                </li>
              ))}
            </ul>
            <Link href="/signup?role=resident" className="mt-8 inline-block text-sm text-gleam hover:text-gleam-300 transition-colors">
              Sign up as a resident →
            </Link>
          </div>
          <div className="rounded-2xl border border-white/15 bg-ink-900/85 p-8 shadow-card backdrop-blur-xl ring-1 ring-inset ring-white/[0.06] space-y-5">
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-gleam">Building wash day</div>
              <p className="mt-2 text-sm leading-relaxed text-ink-200">
                Scheduled visit — operators set their own rate for partnered buildings. Residents always see the exact price before booking.
              </p>
            </div>
            <div className="border-t border-white/15 pt-5">
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-gleam">On-demand slot</div>
              <p className="mt-2 text-sm leading-relaxed text-ink-200">
                Book any available date. Price is set by the operator and shown upfront.
              </p>
            </div>
            <p className="text-xs leading-relaxed text-ink-400">
              No surprises. Every operator sets their own rates.
            </p>
          </div>
        </div>
      </section>

      {/* Operator features */}
      <section className="relative mx-auto max-w-6xl px-6 py-20 border-t border-white/10">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 items-center">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-gleam mb-3">For operators</div>
            <h2 className="font-display text-4xl font-semibold tracking-tight leading-[1.1] md:text-5xl mb-3">
              Recurring revenue, <span className="gleam-text">no marketing</span>
            </h2>
            <p className="text-ink-400 text-sm leading-relaxed max-w-md mb-8">
              Partner with apartment buildings and get a guaranteed customer base. Fill open slots with on-demand bookings between visits.
            </p>
            <ul className="space-y-5 text-sm text-ink-300">
              {[
                'Buildings bring the residents — you show up and wash',
                'Set your own rates for scheduled wash days and open slots',
                'Stripe payouts directly to your account after each wash',
                'Manage your schedule, capacity, and service radius from your dashboard',
                'Build your reputation with verified reviews from real residents',
              ].map((text) => (
                <li key={text} className="flex gap-3.5">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gleam/70" aria-hidden />
                  <span className="leading-relaxed">{text}</span>
                </li>
              ))}
            </ul>
            <Link href="/signup?role=operator" className="mt-8 inline-block text-sm text-gleam hover:text-gleam-300 transition-colors">
              Apply as an operator →
            </Link>
          </div>
          <div className="rounded-2xl border border-white/15 bg-ink-900/85 p-8 shadow-card backdrop-blur-xl ring-1 ring-inset ring-white/[0.06] space-y-5">
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-gleam">Building partnerships</div>
              <p className="mt-2 text-sm leading-relaxed text-ink-200">
                Apply to partner with buildings in your area. Once approved, you run scheduled wash days and get direct access to their residents.
              </p>
            </div>
            <div className="border-t border-white/15 pt-5">
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-gleam">Open-slot bookings</div>
              <p className="mt-2 text-sm leading-relaxed text-ink-200">
                Residents can book you on any day you mark available — at your open-slot rate. Fill dead days without lifting a finger on marketing.
              </p>
            </div>
            <p className="text-xs leading-relaxed text-ink-400">
              Background check required. Stripe Connect onboarding takes under 10 minutes.
            </p>
          </div>
        </div>
      </section>

      {/* Property manager features */}
      <section className="relative mx-auto max-w-6xl px-6 py-20 border-t border-white/10">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 items-center">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-gleam mb-3">For property managers</div>
            <h2 className="font-display text-4xl font-semibold tracking-tight leading-[1.1] md:text-5xl mb-3">
              A premium amenity, <span className="gleam-text">zero cost</span>
            </h2>
            <p className="text-ink-400 text-sm leading-relaxed max-w-md mb-8">
              Add Lavo to your building in minutes. Residents get a curated car wash experience. You get a talking point for every lease renewal.
            </p>
            <ul className="space-y-5 text-sm text-ink-300">
              {[
                'Free to add — Lavo never charges the building',
                'We vet and insure every operator before they set foot on your property',
                'Share a QR code or link — residents sign up themselves',
                'Monthly wash-day summary you can drop into your resident newsletter',
                'Works with any garage or surface lot setup',
              ].map((text) => (
                <li key={text} className="flex gap-3.5">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gleam/70" aria-hidden />
                  <span className="leading-relaxed">{text}</span>
                </li>
              ))}
            </ul>
            <Link href="/signup?role=building_manager" className="mt-8 inline-block text-sm text-gleam hover:text-gleam-300 transition-colors">
              Get your building link →
            </Link>
          </div>
          <div className="rounded-2xl border border-white/15 bg-ink-900/85 p-8 shadow-card backdrop-blur-xl ring-1 ring-inset ring-white/[0.06] space-y-5">
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-gleam">Setup</div>
              <p className="mt-2 text-sm leading-relaxed text-ink-200">
                Create your building profile, set your garage layout, and generate a shareable resident link — all in under 5 minutes.
              </p>
            </div>
            <div className="border-t border-white/15 pt-5">
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-gleam">Ongoing</div>
              <p className="mt-2 text-sm leading-relaxed text-ink-200">
                Operators handle scheduling, payments, and resident communication. You just watch the amenity run itself.
              </p>
            </div>
            <p className="text-xs leading-relaxed text-ink-400">
              No contracts. No fees. Cancel any time.
            </p>
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-3xl px-6 py-16 border-t border-white/10">
        <div className="text-center mb-10">
          <div className="text-xs uppercase tracking-[0.18em] text-gleam mb-2">FAQ</div>
          <h2 className="font-display text-3xl">Questions we hear a lot</h2>
        </div>
        <dl className="space-y-6 text-sm text-ink-300">
          <div>
            <dt className="font-medium text-ink-100">Do I need to be home?</dt>
            <dd className="mt-1 leading-relaxed">
              Usually not. You tell us how to access your garage or spot. Many residents leave keys with concierge or use building protocols your operator already knows.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-ink-100">How do I know the wash happened?</dt>
            <dd className="mt-1 leading-relaxed">
              Operators upload before-and-after photos to your booking. You get a notification when the wash is marked complete.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-ink-100">What if my building is not listed yet?</dt>
            <dd className="mt-1 leading-relaxed">
              Use the checker at the top of this page. We track demand by address and notify you when an operator activates your building.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-ink-100">Can I cancel?</dt>
            <dd className="mt-1 leading-relaxed">
              Yes — cancel from your resident portal up to 24 hours before your scheduled slot, per our terms.
            </dd>
          </div>
        </dl>
      </section>

      {/* CTA strip */}
      <section className="relative mx-auto max-w-6xl px-6 py-20">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="card p-8">
            <h3 className="font-display text-2xl mb-2">Manage a building?</h3>
            <p className="text-sm text-ink-300 mb-6">Add Lavo as a free amenity. Takes 5 minutes. No credit card. Ever.</p>
            <Link href="/signup?role=building_manager" className="btn-primary">Get your building link →</Link>
          </div>
          <div className="card p-8">
            <h3 className="font-display text-2xl mb-2">Run a mobile car wash or detailing business?</h3>
            <p className="text-sm text-ink-300 mb-6">Apply to join our operator network and start receiving building partnerships.</p>
            <Link href="/signup?role=operator" className="btn-ghost">Apply as an operator →</Link>
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-3xl px-6 pb-8">
        <RelatedLinks links={HOME_RELATED} title="Explore Lavo" />
      </section>

      <MarketingFooter />
    </main>
  );
}
