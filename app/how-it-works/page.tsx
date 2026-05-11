import Link from 'next/link';
import { MarketingNav, MarketingFooter } from '@/components/MarketingNav';

export const metadata = { title: 'How it works · Lavo' };

export default function HowItWorksPage() {
  return (
    <main className="relative">
      <div className="absolute inset-x-0 top-0 h-[400px] bg-gleam-fade" />
      <MarketingNav />

      <section className="relative pt-16 pb-16 text-center px-6">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-display text-5xl font-semibold tracking-tight">How Lavo works</h1>
          <p className="mt-4 text-lg text-ink-300">
            Three actors. One simple loop. Apartment residents get a convenient car wash. Local operators get recurring demand. Buildings get a free amenity.
          </p>
        </div>
      </section>

      {/* Full lifecycle */}
      <section className="mx-auto max-w-3xl px-6 py-12">
        <div className="space-y-1">
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
              body: 'The manager browses nearby car wash operators (sorted by distance within the building\'s radius), and sends a partnership request to the one they want. The operator reviews and accepts.',
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
              who: 'Car wash operator',
              title: 'Operator runs the wash',
              body: 'The operator\'s crew tool shows all bookings for the day: building, resident name, vehicle details (color, make, model, plate), and parking spot label. Crew taps "Mark done" per vehicle. The resident gets a notification.',
            },
            {
              num: '07',
              who: 'Resident',
              title: 'Resident reviews and rebooks',
              body: 'After the wash is marked complete, the resident sees it in their history and can leave a star rating and comment. A one-tap rebook option surfaces the same operator for their next wash.',
            },
            {
              num: '08',
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

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-6 py-20">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="card p-6 text-center">
            <div className="text-2xl mb-3">🏢</div>
            <h3 className="font-display text-xl mb-2">Manage a building</h3>
            <p className="text-sm text-ink-400 mb-4">Free, 5 minutes, no credit card.</p>
            <Link href="/signup?role=building_manager" className="btn-primary w-full">Add your building</Link>
          </div>
          <div className="card p-6 text-center">
            <div className="text-2xl mb-3">🚗</div>
            <h3 className="font-display text-xl mb-2">I'm a resident</h3>
            <p className="text-sm text-ink-400 mb-4">Sign up via your building's QR or link.</p>
            <Link href="/signup?role=resident" className="btn-primary w-full">Book a wash</Link>
          </div>
          <div className="card p-6 text-center">
            <div className="text-2xl mb-3">🧑‍🔧</div>
            <h3 className="font-display text-xl mb-2">Run a car wash</h3>
            <p className="text-sm text-ink-400 mb-4">Apply to join the operator network.</p>
            <Link href="/signup?role=operator" className="btn-ghost w-full">Apply</Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
