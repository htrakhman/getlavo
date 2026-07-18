import Link from 'next/link';
import { MarketingNav } from '@/components/MarketingNav';
import { FourStepGrid } from '@/components/marketing/how-it-works/FourStepGrid';
import { JsonLd } from '@/components/seo/JsonLd';
import { organizationSchema, websiteSchema } from '@/lib/seo/schema';
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

const AUDIENCES = [
  {
    id: 'residents',
    title: 'Residents',
    description: 'Book a car wash at your building, right from your phone.',
    points: [
      'Vetted, insured operators your building already trusts',
      'Pay in-app with prices shown before you confirm',
      'Get a photo when your wash is done',
    ],
    signupHref: '/signup?role=resident',
  },
  {
    id: 'property-managers',
    title: 'Property managers',
    description: 'A resident amenity that costs the building nothing to run.',
    points: [
      'Free to add — Lavo never charges the building',
      'Residents book and pay through your building link',
      'We handle operators, scheduling, and payments',
    ],
    signupHref: '/signup?role=building_manager',
  },
  {
    id: 'operators',
    title: 'Operators',
    description: 'Partner with buildings and get a steady base of customers.',
    points: [
      'Buildings bring the residents — you show up and wash',
      'Set your own rates for wash days and open slots',
      'Stripe payouts directly to your account',
    ],
    signupHref: '/signup?role=operator',
  },
] as const;

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
      <section className="relative pt-16 pb-20 text-center px-6">
        <div className="mx-auto max-w-4xl">
          <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl lg:text-7xl">
            Wash your car without<br />
            <span className="gleam-text">thinking about it.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-ink-300">
            Book from your phone. Operators are vetted and insured. Buildings pay nothing.
          </p>

          {/* Get started */}
          <div id="get-started" className="mt-14 scroll-mt-24">
            <div className="flex items-center gap-5 mb-8">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-ink-600" />
              <span className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-400">Get started</span>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-ink-600" />
            </div>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Link href="/signup" className="btn-primary w-full px-8 py-3 text-base sm:w-auto">
                Sign up
              </Link>
              <Link href="/learn-more" className="btn-ghost w-full px-8 py-3 text-base sm:w-auto">
                Learn more
              </Link>
            </div>
            <p className="mt-4 text-sm text-ink-400">
              Residents, property managers, and wash operators each get their own account.
            </p>
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-5 md:grid-cols-2 md:gap-6">
          <div className="card p-7 text-left transition-colors hover:border-gleam/30">
            <div className="text-xs font-semibold uppercase tracking-widest text-gleam">Coverage</div>
            <p className="mt-4 font-display text-2xl font-semibold leading-tight">
              Live in New Jersey, expanding to new cities
            </p>
            <p className="mt-4 text-sm leading-relaxed text-ink-300">
              We serve buildings across New Jersey today and are onboarding new markets. If your building is not
              live yet, signing up helps us bring an operator to your area.
            </p>
          </div>
          <div className="card p-7 text-left transition-colors hover:border-gleam/30">
            <div className="text-xs font-semibold uppercase tracking-widest text-gleam">Trust</div>
            <ul className="mt-4 space-y-3 text-sm text-ink-200">
              {[
                'Background-checked operators',
                'Insured crews',
                'Photo proof on every wash',
                'Stripe secure payments',
              ].map((line) => (
                <li key={line} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gleam" aria-hidden />
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

      {/* Who Lavo is for */}
      <section className="relative border-t border-white/10 bg-ink-800/60">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Who Lavo is for</h2>
            <p className="mt-4 text-ink-300">
              One platform, three sides. Pick yours below — or read the full breakdown on the{' '}
              <Link href="/learn-more" className="font-medium text-gleam hover:text-gleam-300">
                Learn more
              </Link>{' '}
              page.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {AUDIENCES.map((a) => (
              <div key={a.id} className="card flex flex-col p-7">
                <h3 className="font-display text-2xl font-bold tracking-tight">{a.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-300">{a.description}</p>
                <ul className="mt-5 space-y-3 text-sm text-ink-200">
                  {a.points.map((point) => (
                    <li key={point} className="flex gap-3">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gleam" aria-hidden />
                      <span className="leading-relaxed">{point}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto flex items-center gap-5 pt-7">
                  <Link href={a.signupHref} className="text-sm font-semibold text-gleam hover:text-gleam-300 transition-colors">
                    Sign up →
                  </Link>
                  <Link
                    href={`/learn-more#${a.id}`}
                    className="text-sm font-medium text-ink-400 hover:text-ink-100 transition-colors"
                  >
                    Learn more
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative mx-auto max-w-3xl px-6 py-16 border-t border-white/10">
        <div className="text-center mb-10">
          <h2 className="font-display text-3xl font-bold">FAQ</h2>
        </div>
        <dl className="space-y-6 text-sm text-ink-300">
          <div>
            <dt className="font-semibold text-ink-100">Do I need to be home?</dt>
            <dd className="mt-1 leading-relaxed">
              Usually not. You tell us how to access your garage or spot. Many residents leave keys with concierge or use building protocols your operator already knows.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-ink-100">How do I know the wash happened?</dt>
            <dd className="mt-1 leading-relaxed">
              Operators upload before-and-after photos to your booking. You get a notification when the wash is marked complete.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-ink-100">What if my building is not listed yet?</dt>
            <dd className="mt-1 leading-relaxed">
              Check at the top of this page under{' '}
              <a href="#get-started" className="font-medium text-gleam hover:text-gleam-300">
                Get started
              </a>{' '}
              and sign up. We track demand by address and notify you when an operator activates your building.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-ink-100">Can I cancel?</dt>
            <dd className="mt-1 leading-relaxed">
              Yes — cancel from your resident portal up to 24 hours before your scheduled slot, per our terms.
            </dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
