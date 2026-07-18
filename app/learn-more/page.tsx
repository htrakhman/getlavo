import Link from 'next/link';
import { MarketingNav } from '@/components/MarketingNav';
import { createPageMetadata } from '@/lib/seo/site';

export const metadata = createPageMetadata({
  path: '/learn-more',
  title: 'How Lavo Works for Residents, Property Managers, and Operators | Lavo',
  description:
    'A full breakdown of what Lavo offers each group: residents book car washes at their building, property managers add a free amenity, and operators grow recurring revenue.',
});

export default function LearnMorePage() {
  return (
    <main className="relative">
      <div className="absolute inset-x-0 top-0 h-[400px] bg-gleam-fade" />
      <MarketingNav />

      <section className="relative px-6 pt-12 pb-16 text-center">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
            What Lavo does for <span className="gleam-text">each side</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-ink-300">
            Lavo connects three groups on one platform. Here is the full picture for residents, property
            managers, and car wash operators.
          </p>
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
              <h2 className="font-display text-4xl font-bold tracking-tight leading-[1.1] md:text-5xl mb-3">
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
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gleam" aria-hidden />
                    <span className="leading-relaxed">{text}</span>
                  </li>
                ))}
              </ul>
              <Link href="/signup?role=resident" className="btn-primary mt-8">
                Sign up as a resident
              </Link>
            </div>
            <div className="card p-8 space-y-5">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gleam">Building wash day</div>
                <p className="mt-2 text-sm leading-relaxed text-ink-200">
                  Scheduled visit — operators set their own rate for partnered buildings. Residents always see
                  the exact price before booking.
                </p>
              </div>
              <div className="border-t border-white/10 pt-5">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gleam">On-demand slot</div>
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
              <h2 className="font-display text-4xl font-bold tracking-tight leading-[1.1] md:text-5xl mb-4">
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
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gleam" aria-hidden />
                    <span className="leading-relaxed">{text}</span>
                  </li>
                ))}
              </ul>
              <Link href="/signup?role=building_manager" className="btn-primary mt-8">
                Get your building link
              </Link>
            </div>
            <div className="card p-6 sm:p-8">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gleam mb-5">What you get</div>
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
              <h2 className="font-display text-4xl font-bold tracking-tight leading-[1.1] md:text-5xl mb-3">
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
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gleam" aria-hidden />
                    <span className="leading-relaxed">{text}</span>
                  </li>
                ))}
              </ul>
              <Link href="/signup?role=operator" className="btn-primary mt-8">
                Apply as an operator
              </Link>
            </div>
            <div className="card p-8 space-y-5">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gleam">Building partnerships</div>
                <p className="mt-2 text-sm leading-relaxed text-ink-200">
                  Apply to partner with buildings in your area. Once approved, you run scheduled wash days and
                  get direct access to their residents.
                </p>
              </div>
              <div className="border-t border-white/10 pt-5">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gleam">Open-slot bookings</div>
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
    </main>
  );
}
