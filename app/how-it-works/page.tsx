import Link from 'next/link';
import { MarketingNav, MarketingFooter } from '@/components/MarketingNav';
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

const AUDIENCES = [
  {
    id: 'residents',
    label: 'Residents',
    title: 'Book from your phone',
    body: 'Sign up through the building link, add a vehicle and parking spot, then book a wash day or open slot. Payment happens in the app. On wash day, follow your building\'s key or access instructions so the operator can reach your vehicle.',
    href: '/signup?role=resident',
    linkText: 'Resident signup →',
  },
  {
    id: 'buildings',
    label: 'Buildings',
    title: 'Free amenity, zero logistics',
    body: 'Property managers add the building for free, publish the resident QR or link, and approve a local operator partnership. Lavo handles booking, payments, and resident communication.',
    href: '/buildings',
    linkText: 'For properties →',
  },
  {
    id: 'operators',
    label: 'Operators',
    title: 'Scheduled demand in your radius',
    body: 'Apply, set service area and pricing, accept building requests, and run wash days with a resident list in the crew tool. Mark jobs complete, collect reviews, and receive payouts through Stripe.',
    href: '/operators',
    linkText: 'For operators →',
  },
] as const;

const STEPS = [
  {
    num: 1,
    who: 'Building manager',
    title: 'Building adds Lavo',
    body: 'A property manager signs up (free, no credit card), enters their building address, and gets a unique QR code and landing page link. They post the QR in common areas or include the link in a resident email.',
  },
  {
    num: 2,
    who: 'Building manager',
    title: 'Building connects a local car wash',
    body: "The manager browses nearby car wash operators (sorted by distance within the building's radius), and sends a partnership request to the one they want. The operator reviews and accepts.",
  },
  {
    num: 3,
    who: 'Resident',
    title: 'Resident scans and signs up',
    body: 'A resident scans the QR code (or opens the link), signs up with their email, enters their unit number and vehicle details. Their building and the active car wash partner are automatically linked to their account.',
  },
  {
    num: 4,
    who: 'Resident',
    title: 'Resident books a wash',
    body: "From their dashboard, the resident picks a date. If the building has an upcoming scheduled wash day, that slot is shown first at the lower building-day rate. On-demand open slots (at the operator's standard rate) are also available for any day the operator has capacity.",
  },
  {
    num: 5,
    who: 'Resident',
    title: 'Resident pays in-app',
    body: 'Stripe processes the payment securely. The resident pays the wash price. Lavo retains 15–20% as a platform fee, and the remainder is queued for automatic payout to the operator.',
  },
  {
    num: 6,
    who: 'Building & resident',
    title: 'Keys and vehicle access before the crew arrives',
    body: "The building and resident follow the property's wash-day protocol—often key drop with concierge or front desk, or another approved handoff—so the operator can move the vehicle to the designated wash area. This happens before the crew starts work on that vehicle.",
  },
  {
    num: 7,
    who: 'Car wash operator',
    title: 'Operator moves, washes, and returns the vehicle',
    body: 'The operator\'s crew tool shows all bookings for the day: building, resident name, vehicle details (color, make, model, plate), and parking spot label. The crew moves each vehicle per building rules, completes the wash with required before-and-after photos, returns it to the assigned spot, and taps "Mark done." The resident gets a notification.',
  },
  {
    num: 8,
    who: 'Resident',
    title: 'Resident reviews and rebooks',
    body: 'After the wash is marked complete, the resident sees it in their history and can leave a star rating and comment. A one-tap rebook option surfaces the same operator for their next wash.',
  },
  {
    num: 9,
    who: 'Car wash operator',
    title: 'Operator gets paid',
    body: "Each confirmed booking generates a payout entry (gross − Lavo fee = net). Payouts transfer to the operator's connected bank account on a regular basis. Full transaction history is visible in the earnings dashboard.",
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
      <div className="absolute inset-x-0 top-0 h-[520px] bg-gleam-fade" />
      <MarketingNav />

      {/* Hero */}
      <section className="relative px-6 pt-16 pb-12 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-gleam/30 bg-gleam/5 px-4 py-1.5 text-xs font-medium text-gleam">
            How it works
          </div>
          <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
            Three audiences.<br />
            <span className="gleam-text">One booking flow.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-300">
            Lavo lets apartment residents book mobile car washes from their phone. Buildings offer it as a no-cost
            amenity; vetted operators receive scheduled wash-day demand from apartment communities.
          </p>
        </div>
      </section>

      {/* Audience overview */}
      <section className="relative mx-auto max-w-6xl px-6 py-12">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
          {AUDIENCES.map((item) => (
            <article
              key={item.id}
              className="card flex flex-col p-7 ring-1 ring-inset ring-white/[0.04]"
            >
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-gleam">{item.label}</div>
              <h2 className="mt-3 font-display text-xl">{item.title}</h2>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-300">{item.body}</p>
              <Link href={item.href} className="mt-5 text-sm text-gleam hover:underline">
                {item.linkText}
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* Vehicle access */}
      <section className="relative mx-auto max-w-3xl px-6 pb-16">
        <div className="rounded-2xl border border-gleam/20 bg-gleam/5 p-8 ring-1 ring-inset ring-gleam/10">
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-gleam">Wash day</div>
          <h2 className="mt-2 font-display text-2xl">Vehicle access on wash day</h2>
          <p className="mt-4 text-sm leading-relaxed text-ink-300">
            Before the crew arrives, many buildings complete key collection or concierge handoff so operators can move
            vehicles to the approved wash area without residents waiting on site. The building sets the protocol; the
            partnered operator follows it for every booked vehicle that day.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-ink-400">
            Building–operator terms assign liability for vehicle damage to the operator for the full service window,
            including movement to and from the wash area.{' '}
            <Link href="/legal/damage-policy" className="text-gleam hover:underline">
              Damage policy →
            </Link>
          </p>
        </div>
      </section>

      {/* Step-by-step timeline */}
      <section className="relative border-t border-white/10 bg-ink-950/40 py-20">
        <div className="mx-auto max-w-3xl px-6">
          <div className="mb-14 text-center">
            <div className="text-xs uppercase tracking-[0.18em] text-gleam">The full flow</div>
            <h2 className="mt-2 font-display text-4xl">Step by step</h2>
            <p className="mt-3 text-sm text-ink-400">From building signup to operator payout.</p>
          </div>

          <ol className="relative space-y-10 border-l border-white/10 pl-8 sm:pl-10">
            {STEPS.map((step) => (
              <li key={step.num} className="relative">
                <span
                  className="absolute -left-[2.125rem] flex h-8 w-8 items-center justify-center rounded-full border border-gleam/30 bg-ink-900 font-display text-sm text-gleam sm:-left-[2.375rem]"
                  aria-hidden
                >
                  {step.num}
                </span>
                <div className="mb-2">
                  <RolePill who={step.who} />
                </div>
                <h3 className="font-display text-lg text-ink-100">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-300">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative mx-auto max-w-3xl px-6 py-12">
        <VisibleFaq items={[...FAQ]} />
      </section>

      {/* Get started */}
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
