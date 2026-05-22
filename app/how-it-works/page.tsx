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
];

export default function HowItWorksPage() {
  return (
    <main className="relative">
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'How it works', path: '/how-it-works' },
        ])}
      />
      <div className="absolute inset-x-0 top-0 h-[400px] bg-gleam-fade" />
      <MarketingNav />

      <section className="relative pt-16 pb-10 text-center px-6">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-display text-5xl font-semibold tracking-tight">How Lavo works</h1>
          <p className="mt-4 text-lg text-ink-300">
            Three audiences. One booking flow. Residents, buildings, and operators each have a clear role.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-8">
        <h2 className="font-display text-3xl text-ink-100">How does Lavo work?</h2>
        <p className="mt-4 text-sm leading-relaxed text-ink-300">
          Lavo lets apartment residents book mobile car washes directly from their phone. Buildings can offer Lavo as a no cost resident amenity, while vetted operators receive scheduled wash day demand from apartment communities.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-10 space-y-10">
        <div className="card p-6">
          <h2 className="font-display text-2xl">How it works for residents</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-300">
            Residents sign up through the building link, add a vehicle and parking spot, then book a wash day or open slot. Payment happens in the app. On wash day, follow your building&apos;s key or access instructions so the operator can reach your vehicle. After service, residents get completion notice and can leave a review.
          </p>
          <Link href="/signup?role=resident" className="mt-4 inline-block text-sm text-gleam hover:underline">
            Resident signup
          </Link>
        </div>
        <div className="card p-6">
          <h2 className="font-display text-2xl">How it works for buildings</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-300">
            Property managers add the building for free, publish the resident QR or link, and approve a local operator partnership. Lavo handles booking, payments, and resident communication so the desk is not running wash logistics.
          </p>
          <Link href="/buildings" className="mt-4 inline-block text-sm text-gleam hover:underline">
            For properties
          </Link>
        </div>
        <div className="card p-6">
          <h2 className="font-display text-2xl">Vehicle access on wash day</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-300">
            Before the crew arrives, many buildings complete key collection or concierge handoff so operators can move vehicles to the approved wash area without residents waiting on site. The building sets the protocol; the partnered operator follows it for every booked vehicle that day.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-ink-300">
            Building–operator terms assign liability for vehicle damage to the operator for the full service window, including movement to and from the wash area.{' '}
            <Link href="/legal/damage-policy" className="text-gleam hover:underline">
              Damage policy
            </Link>
          </p>
        </div>
        <div className="card p-6">
          <h2 className="font-display text-2xl">How it works for operators</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-300">
            Operators apply, set service area and pricing, accept building requests, and run wash days with a resident list in the crew tool. Partnership terms include responsibility for resident vehicles during service, including when moving cars per building access rules. Mark jobs complete, collect reviews, and receive payouts through Stripe.
          </p>
          <Link href="/operators" className="mt-4 inline-block text-sm text-gleam hover:underline">
            For operators
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-8">
        <h2 className="font-display text-3xl text-center mb-8">Step by step</h2>
        <div className="space-y-6">
          {[
            {
              num: '01',
              who: 'Building manager',
              title: 'Building adds Lavo',
              body: 'A property manager signs up (free, no credit card), enters their building address, and gets a unique QR code and landing page link. They post the QR in common areas or include the link in a resident email.',
            },
            {
              num: '02',
              who: 'Building manager',
              title: 'Building connects a local car wash',
              body: "The manager browses nearby car wash operators (sorted by distance within the building's radius), and sends a partnership request to the one they want. The operator reviews and accepts.",
            },
            {
              num: '03',
              who: 'Resident',
              title: 'Resident scans and signs up',
              body: 'A resident scans the QR code (or opens the link), signs up with their email, enters their unit number and vehicle details. Their building and the active car wash partner are automatically linked to their account.',
            },
            {
              num: '04',
              who: 'Resident',
              title: 'Resident books a wash',
              body: 'From their dashboard, the resident picks a date. If the building has an upcoming scheduled wash day, that slot is shown first at the lower building-day rate. On-demand open slots (at the operator\'s standard rate) are also available for any day the operator has capacity.',
            },
            {
              num: '05',
              who: 'Resident',
              title: 'Resident pays in-app',
              body: 'Stripe processes the payment securely. The resident pays the wash price. Lavo retains 15–20% as a platform fee, and the remainder is queued for automatic payout to the operator.',
            },
            {
              num: '06',
              who: 'Building / Resident',
              title: 'Keys and vehicle access before the crew arrives',
              body: 'The building and resident follow the property\'s wash-day protocol—often key drop with concierge or front desk, or another approved handoff—so the operator can move the vehicle to the designated wash area. This happens before the crew starts work on that vehicle.',
            },
            {
              num: '07',
              who: 'Car wash operator',
              title: 'Operator moves, washes, and returns the vehicle',
              body: 'The operator\'s crew tool shows all bookings for the day: building, resident name, vehicle details (color, make, model, plate), and parking spot label. The crew moves each vehicle per building rules, completes the wash with required before-and-after photos, returns it to the assigned spot, and taps "Mark done." The resident gets a notification.',
            },
            {
              num: '08',
              who: 'Resident',
              title: 'Resident reviews and rebooks',
              body: 'After the wash is marked complete, the resident sees it in their history and can leave a star rating and comment. A one-tap rebook option surfaces the same operator for their next wash.',
            },
            {
              num: '09',
              who: 'Car wash operator',
              title: 'Operator gets paid',
              body: 'Each confirmed booking generates a payout entry (gross − Lavo fee = net). Payouts transfer to the operator\'s connected bank account on a regular basis. Full transaction history is visible in the earnings dashboard.',
            },
          ].map((step) => (
            <div key={step.num} className="card p-6 flex gap-6 items-start">
              <div className="shrink-0">
                <div className="font-display text-3xl text-gleam/40">{step.num}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-ink-500 mb-1">{step.who}</div>
                <div className="font-display text-xl mb-2">{step.title}</div>
                <p className="text-sm text-ink-300 leading-relaxed">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-10">
        <VisibleFaq items={FAQ} />
      </section>

      <section className="mx-auto max-w-4xl px-6 py-12">
        <h2 className="font-display text-3xl text-center mb-8">Get started</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="card p-6 text-center">
            <div className="text-2xl mb-3">🏢</div>
            <h3 className="font-display text-xl mb-2">Manage a building</h3>
            <p className="text-sm text-ink-400 mb-4">Free, 5 minutes, no credit card.</p>
            <Link href="/signup?role=building_manager" className="btn-primary w-full">Add your building</Link>
          </div>
          <div className="card p-6 text-center">
            <div className="text-2xl mb-3">🚗</div>
            <h3 className="font-display text-xl mb-2">I&apos;m a resident</h3>
            <p className="text-sm text-ink-400 mb-4">Sign up via your building&apos;s QR or link.</p>
            <Link href="/signup?role=resident" className="btn-primary w-full">Book a wash</Link>
          </div>
          <div className="card p-6 text-center">
            <div className="text-2xl mb-3">🧑‍🔧</div>
            <h3 className="font-display text-xl mb-2">Run a mobile car wash or detailing business</h3>
            <p className="text-sm text-ink-400 mb-4">Apply to join the operator network.</p>
            <Link href="/signup?role=operator" className="btn-ghost w-full">Apply</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-8">
        <RelatedLinks links={HOW_IT_WORKS_RELATED} />
      </section>

      <MarketingFooter />
    </main>
  );
}
