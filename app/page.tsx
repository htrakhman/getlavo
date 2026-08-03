import Link from 'next/link';
import { MarketingNav } from '@/components/MarketingNav';
import { FourStepGrid } from '@/components/marketing/how-it-works/FourStepGrid';
import { JsonLd } from '@/components/seo/JsonLd';
import { faqPageSchema, organizationSchema, websiteSchema } from '@/lib/seo/schema';
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
      'Pay online with prices shown before you confirm',
      'Get a photo when your wash is done',
    ],
    signupHref: '/signup?role=resident',
    accentBar: 'border-t-teal-500',
    accentTitle: 'text-teal-600',
    accentDot: 'bg-teal-500',
    accentLink: 'text-teal-600 hover:text-teal-700',
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
    accentBar: 'border-t-sky-400',
    accentTitle: 'text-sky-500',
    accentDot: 'bg-sky-400',
    accentLink: 'text-sky-500 hover:text-sky-600',
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
    accentBar: 'border-t-blue-800',
    accentTitle: 'text-blue-800',
    accentDot: 'bg-blue-800',
    accentLink: 'text-blue-800 hover:text-blue-900',
  },
] as const;

// `answer` is the plain-text version used for FAQPage schema; `node` renders the
// same answer with inline links where the visible copy has them.
const HOME_FAQ: { question: string; answer: string; node?: React.ReactNode }[] = [
  {
    question: 'Do I need to be home?',
    answer:
      'Usually not. You tell us how to access your garage or spot. Many residents leave keys with concierge or use building protocols your operator already knows.',
  },
  {
    question: 'How do I know the wash happened?',
    answer:
      'Operators upload before-and-after photos to your booking. You get a notification when the wash is marked complete.',
  },
  {
    question: 'What if my building is not listed yet?',
    answer:
      'Check at the top of this page under Get started and sign up. We track demand by address and notify you when an operator activates your building.',
    node: (
      <>
        Check at the top of this page under{' '}
        <a href="#get-started" className="font-medium text-gleam hover:text-gleam-300">
          Get started
        </a>{' '}
        and sign up. We track demand by address and notify you when an operator activates your
        building.
      </>
    ),
  },
  {
    question: 'Can I cancel?',
    answer:
      'Yes — cancel from your resident portal any time. Cancel more than 24 hours before your slot and you are refunded in full; inside 24 hours the booking is not refunded.',
  },
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
      <JsonLd data={[organizationSchema(), websiteSchema(), faqPageSchema('/', HOME_FAQ)]} />
      <div className="absolute inset-x-0 top-0 h-[600px] bg-gleam-fade" />
      <MarketingNav />

      {/* Hero */}
      <section className="relative pt-16 pb-20 text-center px-6">
        <div className="mx-auto max-w-4xl">
          <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl lg:text-7xl">
            Wash your car without<br />
            <span className="gleam-text">thinking about it.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-ink-300">
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
              <Link
                href="/signup?role=resident"
                className="w-full rounded-full bg-teal-600 px-7 py-3 text-base font-medium text-teal-50 shadow-card transition-colors hover:bg-teal-700 sm:w-auto"
              >
                Sign up as a resident
              </Link>
              <Link
                href="/signup?role=building_manager"
                className="w-full rounded-full bg-sky-500 px-7 py-3 text-base font-medium text-white shadow-card transition-colors hover:bg-sky-600 sm:w-auto"
              >
                Sign up as a property manager
              </Link>
              <Link
                href="/signup?role=operator"
                className="w-full rounded-full bg-blue-800 px-7 py-3 text-base font-medium text-blue-50 shadow-card transition-colors hover:bg-blue-900 sm:w-auto"
              >
                Sign up as an operator
              </Link>
            </div>
            <p className="mt-4 text-sm text-ink-400">
              Each group gets its own account.{' '}
              <Link href="/how-it-works" className="font-medium text-gleam hover:text-gleam-300">
                See how it works →
              </Link>
            </p>
          </div>
        </div>
      </section>

      <FourStepGrid
        variant="accent"
        title="How it works"
        subtitle="Book from your phone. A vetted crew washes your car at your building. You get notified when it's done."
        footerHref="/how-it-works"
        footerLabel="Full guide for buildings and operators"
      />

      {/* Who Lavo is for */}
      <section className="relative border-t border-white/10 bg-ink-800/60">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-xs font-semibold uppercase tracking-[0.25em] text-gleam">One platform, three sides</div>
            <h2 className="mt-3 font-display text-4xl font-bold tracking-tight md:text-5xl">Who Lavo is for</h2>
            <p className="mt-4 text-ink-300">
              Pick yours below — or read the full breakdown on the{' '}
              <Link href="/how-it-works" className="font-medium text-gleam hover:text-gleam-300">
                How it works
              </Link>{' '}
              page.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {AUDIENCES.map((a) => (
              <div key={a.id} className={`card flex flex-col border-t-4 p-7 ${a.accentBar}`}>
                <h3 className={`font-display text-2xl font-bold tracking-tight ${a.accentTitle}`}>{a.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-300">{a.description}</p>
                <ul className="mt-5 space-y-3 text-sm text-ink-200">
                  {a.points.map((point) => (
                    <li key={point} className="flex gap-3">
                      <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${a.accentDot}`} aria-hidden />
                      <span className="leading-relaxed">{point}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto flex items-center gap-5 pt-7">
                  <Link href={a.signupHref} className={`text-sm font-semibold transition-colors ${a.accentLink}`}>
                    Sign up →
                  </Link>
                  <Link
                    href={`/how-it-works#${a.id}`}
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
          <div className="text-xs font-semibold uppercase tracking-[0.25em] text-gleam">Questions</div>
          <h2 className="mt-3 font-display text-4xl font-bold tracking-tight md:text-5xl">FAQ</h2>
        </div>
        <dl className="space-y-4 text-sm text-ink-300">
          {HOME_FAQ.map((item) => (
            <div key={item.question} className="card p-6">
              <dt className="font-display text-base font-semibold text-ink-100">{item.question}</dt>
              <dd className="mt-2 leading-relaxed">{item.node ?? item.answer}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
