import Link from 'next/link';
import { MarketingNav, MarketingFooter } from '@/components/MarketingNav';
import {
  HowLavoWorks,
  PROCESS_PHASES,
  WashDayAccessFlow,
} from '@/components/marketing/HowItWorksFlow';
import { RelatedLinks } from '@/components/marketing/RelatedLinks';
import { VisibleFaq } from '@/components/marketing/VisibleFaq';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbSchema } from '@/lib/seo/schema';
import { createPageMetadata } from '@/lib/seo/site';

export const metadata = createPageMetadata({
  path: '/how-it-works',
  title: 'How Apartment Mobile Car Wash Works | Lavo',
  description:
    'See how Lavo works for residents, apartment buildings, and mobile car wash operators from signup to booking, service, review, and payout.',
});

const HOW_IT_WORKS_RELATED = [
  { href: '/buildings', label: 'For properties' },
  { href: '/operators', label: 'For operators' },
  { href: '/safety', label: 'Safety' },
  { href: '/legal/damage-policy', label: 'Damage policy' },
  { href: '/resources/mobile-car-wash-apartment-garage', label: 'Mobile car wash in apartment garages' },
];

const ROLE_LINKS = [
  {
    label: 'Property managers',
    title: 'For buildings',
    body: 'Free amenity, QR for residents, pick a local operator—Lavo runs the booking stack.',
    href: '/buildings',
  },
  {
    label: 'Residents',
    title: 'Book a wash',
    body: 'Sign up through your building link, book from your phone, pay in the app.',
    href: '/signup?role=resident',
  },
  {
    label: 'Operators',
    title: 'Join the network',
    body: 'Accept building partnerships, run wash days from the crew tool, get paid via Stripe.',
    href: '/operators',
  },
] as const;

const FAQ = [
  {
    question: 'Who pays for the car wash?',
    answer:
      'Residents pay for washes they book. Buildings do not pay to offer Lavo as an amenity.',
  },
  {
    question: 'How does a building get started?',
    answer:
      'A property manager creates a building profile, shares the resident link or QR code, and connects with a mobile operator in the area.',
  },
  {
    question: 'Can residents book on-demand?',
    answer:
      'Yes, when the partnered operator has open capacity. Building wash days are often shown first at building-day rates.',
  },
  {
    question: 'How do operators get paid?',
    answer:
      'Stripe processes resident payments. Lavo retains a platform fee and queues the remainder for operator payout.',
  },
  {
    question: 'How do operators access my car?',
    answer:
      'Many buildings arrange key collection or concierge handoff before the crew arrives so the operator can move your vehicle to the approved wash area. Your building sets the protocol; the partnered operator follows it on wash day.',
  },
  {
    question: 'Who is responsible if something happens to my car?',
    answer:
      'Building–operator partnership terms assign liability for vehicle damage to the operator, including during movement to the wash area. See the damage policy for how to report an issue.',
  },
] as const;

function RolePill({ who }: { who: string }) {
  return (
    <span className="inline-block rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-ink-400">
      {who}
    </span>
  );
}

export default function HowItWorksPage() {
  return (
    <main className="relative">
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'How it works', path: '/how-it-works' },
        ])}
      />
      <div className="absolute inset-x-0 top-0 h-[480px] bg-gleam-fade" />
      <MarketingNav />

      <section className="relative px-6 pt-16 pb-10 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-gleam/30 bg-gleam/5 px-4 py-1.5 text-xs font-medium text-gleam">
            How it works
          </div>
          <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
            How Lavo<br />
            <span className="gleam-text">works.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-300">
            Buildings add the amenity for free, residents book and pay from their phone, and partnered operators run
            wash days in your garage or lot. Setup → book → wash day → review and payout.
          </p>
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-6 pb-16">
        <HowLavoWorks variant="full" />
      </section>

      {/* Phase details */}
      <section className="relative border-t border-white/10 bg-ink-950/40 py-20">
        <div className="mx-auto max-w-3xl px-6">
          <div className="mb-12 text-center">
            <div className="text-xs uppercase tracking-[0.18em] text-gleam">Details</div>
            <h2 className="mt-2 font-display text-4xl">Each phase, step by step</h2>
            <p className="mt-3 text-sm text-ink-400">Matches the four phases in the diagram above.</p>
          </div>

          <div className="space-y-14">
            {PROCESS_PHASES.map((phase) => (
              <div key={phase.id} id={phase.id}>
                <div className="mb-6 border-b border-white/10 pb-4">
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-gleam">
                    {phase.phaseLabel}
                  </div>
                  <h3 className="mt-1 font-display text-2xl text-ink-100">{phase.title}</h3>
                </div>

                <ol className="space-y-8">
                  {phase.steps.map((step) => (
                    <li key={step.title} className="flex gap-4">
                      <span
                        className="mt-1 flex h-2 w-2 shrink-0 rounded-full bg-gleam/70"
                        aria-hidden
                      />
                      <div>
                        <RolePill who={step.who} />
                        <h4 className="mt-2 font-display text-lg text-ink-100">{step.title}</h4>
                        <p className="mt-2 text-sm leading-relaxed text-ink-300">{step.body}</p>
                      </div>
                    </li>
                  ))}
                </ol>

                {'showWashDayDiagram' in phase && phase.showWashDayDiagram && (
                  <div className="mt-8">
                    <WashDayAccessFlow />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Role-specific deep dives */}
      <section className="relative mx-auto max-w-6xl px-6 py-16">
        <div className="mb-8 text-center">
          <h2 className="font-display text-3xl">Learn more by role</h2>
          <p className="mt-2 text-sm text-ink-400">Dedicated pages for property teams, residents, and operators.</p>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
          {ROLE_LINKS.map((item) => (
            <article key={item.href} className="card flex flex-col p-6">
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-gleam">{item.label}</div>
              <h3 className="mt-2 font-display text-xl">{item.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-300">{item.body}</p>
              <Link href={item.href} className="mt-4 text-sm text-gleam hover:underline">
                Read more →
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="relative mx-auto max-w-3xl px-6 py-12">
        <VisibleFaq items={[...FAQ]} />
      </section>

      <section className="relative mx-auto max-w-6xl px-6 py-16">
        <h2 className="mb-8 text-center font-display text-3xl">Get started</h2>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
          <div className="card p-7 text-center">
            <h3 className="font-display text-xl">Manage a building</h3>
            <p className="mt-2 text-sm text-ink-400">Free, 5 minutes, no credit card.</p>
            <Link href="/signup?role=building_manager" className="btn-primary mt-6 w-full">
              Add your building
            </Link>
          </div>
          <div className="card p-7 text-center">
            <h3 className="font-display text-xl">I&apos;m a resident</h3>
            <p className="mt-2 text-sm text-ink-400">Sign up via your building&apos;s QR or link.</p>
            <Link href="/signup?role=resident" className="btn-primary mt-6 w-full">
              Book a wash
            </Link>
          </div>
          <div className="card p-7 text-center">
            <h3 className="font-display text-xl">Run a mobile car wash</h3>
            <p className="mt-2 text-sm text-ink-400">Apply to join the operator network.</p>
            <Link href="/signup?role=operator" className="btn-ghost mt-6 w-full">
              Apply
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-12">
        <RelatedLinks links={HOW_IT_WORKS_RELATED} />
      </section>

      <MarketingFooter />
    </main>
  );
}
