import Link from 'next/link';
import { MarketingNav } from '@/components/MarketingNav';
import { ResidentFinalCta } from '@/components/marketing/how-it-works/ResidentFinalCta';
import { RelatedLinks } from '@/components/marketing/RelatedLinks';
import { VisibleFaq } from '@/components/marketing/VisibleFaq';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbSchema } from '@/lib/seo/schema';
import { createPageMetadata } from '@/lib/seo/site';

export const metadata = createPageMetadata({
  path: '/how-it-works',
  title: 'How Lavo Works for Residents, Property Managers, and Operators | Lavo',
  description:
    'How Lavo brings three groups together: residents book car washes at their building, property managers add a free amenity, and operators grow recurring revenue.',
});

const HOW_IT_WORKS_RELATED = [
  { href: '/buildings', label: 'For properties' },
  { href: '/operators', label: 'For operators' },
  { href: '/residents', label: 'For residents' },
  { href: '/safety', label: 'Safety' },
  { href: '/legal/damage-policy', label: 'Damage policy' },
  { href: '/resources/mobile-car-wash-apartment-garage', label: 'Mobile car wash in apartment garages' },
];

const FAQ = [
  {
    question: 'Do I need to be there?',
    answer:
      'Usually not. You tell us how to access your car when you book, so the wash can happen while you go about your day.',
  },
  {
    question: 'Where does the wash happen?',
    answer:
      'At your building, either in your parking spot or in an approved wash area.',
  },
  {
    question: 'How do I know when my car is done?',
    answer: 'You’ll get notified when the wash is complete.',
  },
  {
    question: 'What if my building does not have Lavo yet?',
    answer:
      'You can request Lavo for your building and we’ll let you know when it becomes available.',
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
      <div className="absolute inset-x-0 top-0 h-[500px] bg-gleam-fade" />
      <MarketingNav />

      {/* Hero */}
      <section className="relative px-6 pt-12 pb-16 text-center">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
            How Lavo <span className="gleam-text">works</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-ink-300">
            Lavo brings three groups together on one platform. Residents get car washes at home,
            property managers get a free amenity, and operators get a steady base of customers.
            Here is the full picture for each side.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4">
            <Link href="#check-building" className="btn-primary px-8 py-3 text-base">
              Check my building&apos;s availability
            </Link>
          </div>
          <nav className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm">
            <a href="#residents" className="chip px-4 py-2 hover:border-gleam/40 transition-colors">Residents</a>
            <a href="#property-managers" className="chip px-4 py-2 hover:border-gleam/40 transition-colors">Property managers</a>
            <a href="#operators" className="chip px-4 py-2 hover:border-gleam/40 transition-colors">Operators</a>
          </nav>
        </div>
      </section>

      {/* Residents */}
      <section id="residents" className="relative scroll-mt-24 border-t border-white/10">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 items-center">
            <div>
              <h2 className="font-display text-4xl font-bold tracking-tight leading-[1.1] md:text-5xl mb-3 text-sky-600">
                For residents
              </h2>
              <p className="text-ink-300 leading-relaxed max-w-md mb-8">
                Clean car, zero effort. Book and pay from your phone with operators your building already
                trusts, and see the price before you confirm.
              </p>
              <ul className="space-y-4 text-sm text-ink-200">
                {[
                  "Only see operators within your building's radius — no browsing random listings",
                  'Book a building wash day slot (cheaper) or an on-demand open slot any available day',
                  'Pay securely in-app. No cash, no Venmo, no awkward conversations',
                  'Get a photo when your wash is done. Leave a review from your phone',
                  'Add wax, interior detail, or tire shine as a one-tap upgrade',
                ].map((text) => (
                  <li key={text} className="flex gap-3.5">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" aria-hidden />
                    <span className="leading-relaxed">{text}</span>
                  </li>
                ))}
              </ul>
              <Link href="/signup?role=resident" className="btn-primary mt-8">
                Sign up as a resident
              </Link>
            </div>
            <div className="card p-8 space-y-5 border-t-4 border-t-sky-500">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">Building wash day</div>
                <p className="mt-2 text-sm leading-relaxed text-ink-200">
                  Scheduled visit — operators set their own rate for partnered buildings. Residents always see
                  the exact price before booking.
                </p>
              </div>
              <div className="border-t border-white/10 pt-5">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">On-demand slot</div>
                <p className="mt-2 text-sm leading-relaxed text-ink-200">
                  Book any available date. Price is set by the operator and shown upfront.
                </p>
              </div>
              <p className="text-xs leading-relaxed text-ink-400">
                No surprises. Every operator sets their own rates.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Property managers */}
      <section id="property-managers" className="relative scroll-mt-24 border-t border-white/10 bg-ink-800/60">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16 items-start">
            <div className="max-w-lg">
              <h2 className="font-display text-4xl font-bold tracking-tight leading-[1.1] md:text-5xl mb-4 text-violet-600">
                For property managers
              </h2>
              <p className="text-ink-300 leading-relaxed mb-8">
                A resident amenity your team does not have to manage. Give residents convenient on-site car
                washes without adding budget, staff time, or operational complexity.
              </p>
              <ul className="space-y-4 text-sm text-ink-200">
                {[
                  'Free to add. Lavo never charges the building',
                  'Residents book and pay directly through your building link',
                  'Lavo vets local operators before they service your property',
                  'We provide QR codes, flyers, and resident announcement copy',
                  'Monthly wash day recap you can use in newsletters and renewal communication',
                  'Works with garages, surface lots, and scheduled service days',
                ].map((text) => (
                  <li key={text} className="flex gap-3.5">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" aria-hidden />
                    <span className="leading-relaxed">{text}</span>
                  </li>
                ))}
              </ul>
              <Link href="/signup?role=building_manager" className="btn-primary mt-8">
                Get your building link
              </Link>
            </div>
            <div className="card p-6 sm:p-8 border-t-4 border-t-violet-500">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600 mb-5">What you get</div>
              <div className="divide-y divide-white/10">
                {[
                  {
                    title: 'Custom resident booking link',
                    body: 'A shareable page residents can use to book washes directly.',
                  },
                  {
                    title: 'Launch materials included',
                    body: 'QR code, flyer copy, email copy, and resident announcement language.',
                  },
                  {
                    title: 'Operator coordination handled',
                    body: 'Lavo manages scheduling, payments, provider communication, and service flow.',
                  },
                  {
                    title: 'Simple monthly recap',
                    body: 'A ready to share amenity summary for resident newsletters and leasing follow up.',
                  },
                ].map((item, index) => (
                  <div key={item.title} className={index === 0 ? 'pb-5' : 'py-5'}>
                    <div className="text-sm font-semibold text-ink-100">{item.title}</div>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-300">{item.body}</p>
                  </div>
                ))}
                <p className="pt-5 text-xs leading-relaxed text-ink-400">
                  No building cost. No contract. No staff training.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Operators */}
      <section id="operators" className="relative scroll-mt-24 border-t border-white/10">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 items-center">
            <div>
              <h2 className="font-display text-4xl font-bold tracking-tight leading-[1.1] md:text-5xl mb-3 text-amber-600">
                For operators
              </h2>
              <p className="text-ink-300 leading-relaxed max-w-md mb-8">
                Recurring revenue with no marketing. Partner with apartment buildings and get a guaranteed
                customer base, then fill open slots with on-demand bookings between visits.
              </p>
              <ul className="space-y-4 text-sm text-ink-200">
                {[
                  'Buildings bring the residents — you show up and wash',
                  'Set your own rates for scheduled wash days and open slots',
                  'Stripe payouts directly to your account after each wash',
                  'Manage your schedule, capacity, and service radius from your dashboard',
                  'Build your reputation with verified reviews from real residents',
                ].map((text) => (
                  <li key={text} className="flex gap-3.5">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden />
                    <span className="leading-relaxed">{text}</span>
                  </li>
                ))}
              </ul>
              <Link href="/signup?role=operator" className="btn-primary mt-8">
                Apply as an operator
              </Link>
            </div>
            <div className="card p-8 space-y-5 border-t-4 border-t-amber-500">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">Building partnerships</div>
                <p className="mt-2 text-sm leading-relaxed text-ink-200">
                  Apply to partner with buildings in your area. Once approved, you run scheduled wash days and
                  get direct access to their residents.
                </p>
              </div>
              <div className="border-t border-white/10 pt-5">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">Open-slot bookings</div>
                <p className="mt-2 text-sm leading-relaxed text-ink-200">
                  Residents can book you on any day you mark available — at your open-slot rate. Fill dead days
                  without lifting a finger on marketing.
                </p>
              </div>
              <p className="text-xs leading-relaxed text-ink-400">
                Background check required. Stripe Connect onboarding takes under 10 minutes.
              </p>
            </div>
          </div>
        </div>
      </section>

      <ResidentFinalCta />

      <section className="mx-auto max-w-3xl px-6 py-10">
        <VisibleFaq items={[...FAQ]} />
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-8">
        <RelatedLinks links={HOW_IT_WORKS_RELATED} />
      </section>

    </main>
  );
}
