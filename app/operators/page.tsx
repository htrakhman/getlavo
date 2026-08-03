import Link from 'next/link';
import { MarketingNav } from '@/components/MarketingNav';
import { RelatedLinks } from '@/components/marketing/RelatedLinks';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbSchema, faqPageSchema, serviceSchema } from '@/lib/seo/schema';
import { createPageMetadata } from '@/lib/seo/site';
import { resolveSplit } from '@/lib/stripe/connect-split';

export const metadata = createPageMetadata({
  path: '/operators',
  title: 'Recurring Mobile Car Wash Demand for Operators | Lavo',
  description:
    'Lavo helps mobile car wash operators get recurring apartment building demand with scheduled wash days, resident bookings, and automatic payouts.',
});

/**
 * The two worked examples under "The math works", priced at detail tickets
 * rather than single washes. An operator sizing up Lavo is weighing their whole
 * book of business, and the fee on a $35 wash tells them nothing about what a
 * $500 ceramic package costs them to run through the platform.
 *
 * Computed from the split checkout actually charges rather than typed in — the
 * payouts here used to be hardcoded strings, which is a promise that silently
 * goes stale the first time the take rate or the processing estimate moves.
 */
const PAYOUT_EXAMPLES = [
  { grossCents: 15000, label: 'resident pays (full detail)' },
  { grossCents: 50000, label: 'resident pays (ceramic package)' },
].map(({ grossCents, label }) => {
  const split = resolveSplit(grossCents);
  return {
    label,
    price: `$${Math.round(split.grossCents / 100)}`,
    payout: `$${(split.netCents / 100).toFixed(2)}`,
  };
});

const OPERATORS_RELATED = [
  { href: '/how-it-works', label: 'How it works' },
  { href: '/services', label: 'Wash services' },
  { href: '/contact', label: 'Contact' },
  { href: '/residents', label: 'For residents' },
  { href: '/buildings', label: 'For properties' },
  { href: '/resources/mobile-detailing-leads-apartments', label: 'Recurring apartment customers' },
  { href: '/resources/apartment-wash-day-playbook', label: 'Apartment wash day playbook' },
  { href: '/cities/new-jersey', label: 'New Jersey' },
];

const OPERATORS_FAQS = [
  {
    question: 'What does Lavo cost an operator?',
    answer:
      'Nothing up front. Lavo takes 10% of each booking plus the card processing on that payment (2.9% + 30¢), and transfers the rest to your connected Stripe account automatically. There is no subscription and no lead fee.',
  },
  {
    question: 'How do I get paid?',
    answer:
      'Residents pay in the app when they book. Every confirmed booking triggers an automatic payout to the bank account you connect through Stripe. Your earnings dashboard shows gross, fees, and net per period.',
  },
  {
    question: 'Do I set my own prices?',
    answer:
      'Yes. You set your base wash price, your on-demand price, and any add-on packages such as interior detail, wax, or tire shine.',
  },
  {
    question: 'What do I need to apply?',
    answer:
      'A licensed and insured mobile detailing or car wash operation, a service radius you can reliably cover, a smartphone for the crew tool, and a Stripe-compatible bank account for payouts.',
  },
  {
    question: 'How do building partnerships start?',
    answer:
      'Approved operators appear in the marketplace for buildings inside their service radius. Buildings send you partnership requests, and you accept the ones you want. Each active partnership brings recurring demand at one address.',
  },
  {
    question: 'Do I have to accept every building?',
    answer:
      'No. You review each partnership request and decline any building that does not fit your route, schedule, or capacity.',
  },
  {
    question: 'What insurance do I need?',
    answer:
      'General liability and commercial auto coverage. You upload a certificate of insurance during onboarding, and Lavo tracks its expiration so partnered buildings always have current documentation on file.',
  },
  {
    question: 'How long does approval take?',
    answer:
      'The application takes about five minutes. Once your insurance and Stripe onboarding are complete, Lavo reviews the application and lists you to nearby buildings.',
  },
];

export default function OperatorsPage() {
  return (
    <main className="relative">
      <JsonLd
        data={[
          serviceSchema({
            path: '/operators',
            name: 'Recurring mobile car wash demand for operators',
            serviceType: 'Apartment building demand platform for mobile car wash operators',
            description:
              'Lavo helps mobile car wash operators get recurring apartment building demand with scheduled wash days, resident bookings, and automatic payouts.',
            audience: 'Mobile car wash operators and detailers',
          }),
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'For operators', path: '/operators' },
          ]),
          faqPageSchema('/operators', OPERATORS_FAQS),
        ]}
      />
      <div className="absolute inset-x-0 top-0 h-[500px] bg-gleam-fade" />
      <MarketingNav />

      {/* Hero */}
      <section className="relative pt-16 pb-24 text-center px-6">
        <div className="mx-auto max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-gleam/30 bg-gleam/5 px-4 py-1.5 text-xs font-medium text-gleam mb-8">
            For car wash operators
          </div>
          <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
            Recurring local demand.<br />
            <span className="gleam-text">No marketing spend.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-ink-300">
            Partner with apartment buildings in your area. Run scheduled wash days, accept on-demand bookings,
            and get paid automatically on every wash.
          </p>
          <div className="mt-10">
            <Link href="/operators/apply" className="btn-primary px-8 py-3 text-base">
              Apply as an operator →
            </Link>
          </div>
        </div>
      </section>

      {/* Economics */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="font-display text-4xl">The math works</h2>
          <p className="mt-3 text-ink-300">Lavo takes 10% of each booking plus card processing. You keep the rest — transferred automatically.</p>
        </div>
        {/*
          Two worked payouts and nothing else. There used to be a third card
          promising "$12k+ annual from 1 building · 60 units · 2 washes/month
          each" — a number with no stated participation rate behind it, which
          made it both unfalsifiable and, at 1,440 washes a year, far too low
          for its own assumptions. What an operator can verify is the payout on
          a price they recognise; what they can't verify doesn't belong next to
          it.
        */}
        <div className="mx-auto grid max-w-3xl grid-cols-1 gap-6 md:grid-cols-2">
          {PAYOUT_EXAMPLES.map((example, i) => (
            <div key={example.label} className="card p-6 text-center">
              <div className={`font-display text-4xl${i === 0 ? ' text-gleam' : ''}`}>{example.price}</div>
              <div className="mt-2 text-sm text-ink-400">{example.label}</div>
              <div className="mt-3 text-xs text-ink-500">Your payout: ~{example.payout}</div>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-ink-500">
          Example pricing. You set your own rates. Lavo take rate is 10% per booking, plus card processing of 2.9% + 30¢.
        </p>
      </section>

      {/* How it works for operators */}
      <section className="mx-auto max-w-3xl px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="font-display text-4xl">How it works for operators</h2>
        </div>
        <ol className="space-y-6">
          {[
            ['Apply', 'Submit your company details, service area, hours, pricing, and capacity. You\'ll get access immediately after signup.'],
            ['Connect your bank account', 'Set up Stripe Connect so we can transfer your earnings after each booking. Takes 2 minutes.'],
            ['Get discovered', 'Approved operators appear in building marketplaces within your service radius. Buildings send you partnership requests.'],
            ['Accept partnerships', 'Review requests from nearby buildings and accept the ones you want. Each active partnership brings you a steady pipeline of local demand.'],
            ['Run wash days and take bookings', 'Scheduled building wash days (cheaper for residents) give you predictable batch work. On-demand slots fill your calendar between visits.'],
            ['Get paid', 'Every confirmed booking triggers an automatic payout to your bank account. See your gross, fee, and net in your earnings dashboard.'],
          ].map(([title, body], i) => (
            <li key={String(title)} className="flex gap-6 items-start">
              <span className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-gleam/10 border border-gleam/30 font-display text-lg text-gleam">
                {i + 1}
              </span>
              <div>
                <div className="font-medium">{title}</div>
                <p className="mt-1 text-sm text-ink-300">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Features grid */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {[
            ['Crew tool', 'Run wash days from your phone. Each vehicle row shows the resident, spot label, make/model/color, and plate. Mark done or flag in one tap.'],
            ['Earnings dashboard', 'See gross revenue, Lavo fee, and your net payout per period. Full transaction history at a glance.'],
            ['Radius matching', 'Set your service area in miles. Lavo only shows you to buildings inside your radius — no wasted lead chasing.'],
            ['Add-on revenue', 'Offer residents extras like interior detail, wax, or tire shine. Billed separately via Stripe and split exactly like a wash — 10% to Lavo, card processing out of your share, the rest to you.'],
          ].map(([title, body]) => (
            <div key={String(title)} className="card p-6">
              <h3 className="font-display text-xl mb-2">{title}</h3>
              <p className="text-sm text-ink-300 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Requirements */}
      <section className="mx-auto max-w-3xl px-6 py-20">
        <h2 className="font-display text-4xl mb-8 text-center">Requirements</h2>
        <div className="card p-6 space-y-3 text-sm text-ink-300">
          {[
            'Licensed and insured mobile detailing or car wash operation',
            'Service radius you can reliably cover for wash days and on-demand bookings',
            'Ability to service a consistent weekly or bi-weekly schedule for partnered buildings',
            'A smartphone for the crew tool',
            'A Stripe-compatible bank account for payouts',
          ].map((req) => (
            <div key={req} className="flex gap-3">
              <span className="text-gleam">✓</span>
              <span>{req}</span>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-6 py-20">
        <h2 className="font-display text-4xl mb-10 text-center">Common questions</h2>
        <dl className="space-y-6">
          {OPERATORS_FAQS.map((faq) => (
            <div key={faq.question} className="card p-6">
              <dt className="font-medium">{faq.question}</dt>
              <dd className="mt-2 text-sm text-ink-300 leading-relaxed">{faq.answer}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h2 className="font-display text-4xl mb-4">Ready to grow your book?</h2>
        <p className="text-ink-300 mb-8">Apply takes 5 minutes. Get started right away.</p>
        <Link href="/operators/apply" className="btn-primary px-10 py-4 text-base">
          Apply as an operator →
        </Link>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-8">
        <RelatedLinks links={OPERATORS_RELATED} />
      </section>

    </main>
  );
}
