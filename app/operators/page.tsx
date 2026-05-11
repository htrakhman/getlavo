import Link from 'next/link';
import { MarketingNav, MarketingFooter } from '@/components/MarketingNav';

export const metadata = { title: 'For car wash operators · Lavo' };

export default function OperatorsPage() {
  return (
    <main className="relative">
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
            <Link href="/signup?role=operator" className="btn-primary px-8 py-3 text-base">
              Apply as an operator →
            </Link>
          </div>
        </div>
      </section>

      {/* Economics */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="font-display text-4xl">The math works</h2>
          <p className="mt-3 text-ink-300">Lavo takes 15–20% of each booking. You keep the rest — transferred automatically.</p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="card p-6 text-center">
            <div className="font-display text-4xl text-gleam">$35</div>
            <div className="mt-2 text-sm text-ink-400">resident pays (building day)</div>
            <div className="mt-3 text-xs text-ink-500">Your payout: ~$29</div>
          </div>
          <div className="card p-6 text-center">
            <div className="font-display text-4xl">$45</div>
            <div className="mt-2 text-sm text-ink-400">resident pays (on-demand)</div>
            <div className="mt-3 text-xs text-ink-500">Your payout: ~$37</div>
          </div>
          <div className="card p-6 text-center">
            <div className="font-display text-4xl">$12k+</div>
            <div className="mt-2 text-sm text-ink-400">annual from 1 building</div>
            <div className="mt-3 text-xs text-ink-500">60 units · 2 washes/month each</div>
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-ink-500">
          Example pricing. You set your own rates. Lavo take rate is 15–20% per booking.
        </p>
      </section>

      {/* How it works for operators */}
      <section className="mx-auto max-w-3xl px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="font-display text-4xl">How it works for operators</h2>
        </div>
        <ol className="space-y-6">
          {[
            ['Apply', 'Submit your company details, service area, hours, pricing, and capacity. We review within 48 hours.'],
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
            ['🗓️', 'Crew tool', 'Run wash days from your phone. Each vehicle row shows the resident, spot label, make/model/color, and plate. Mark done or flag in one tap.'],
            ['📊', 'Earnings dashboard', 'See gross revenue, Lavo fee, and your net payout per period. Full transaction history at a glance.'],
            ['📍', 'Radius matching', 'Set your service area in miles. Lavo only shows you to buildings inside your radius — no wasted lead chasing.'],
            ['➕', 'Add-on revenue', 'Offer residents extras like interior detail, wax, or tire shine. Billed separately via Stripe. You keep the proceeds minus the platform fee.'],
          ].map(([icon, title, body]) => (
            <div key={String(title)} className="card p-6">
              <div className="text-3xl mb-3">{icon}</div>
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
            'Coverage area within the Lavo service region',
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

      {/* CTA */}
      <section className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h2 className="font-display text-4xl mb-4">Ready to grow your book?</h2>
        <p className="text-ink-300 mb-8">Apply takes 5 minutes. We review within 48 hours.</p>
        <Link href="/signup?role=operator" className="btn-primary px-10 py-4 text-base">
          Apply as an operator →
        </Link>
      </section>

      <MarketingFooter />
    </main>
  );
}
