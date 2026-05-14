import Link from 'next/link';
import { MarketingNav, MarketingFooter } from '@/components/MarketingNav';
import { EnterpriseLeadForm } from '@/components/EnterpriseLeadForm';

export const metadata = { title: 'For apartment buildings · Lavo' };

export default function BuildingsPage() {
  return (
    <main className="relative">
      <div className="absolute inset-x-0 top-0 h-[500px] bg-gleam-fade" />
      <MarketingNav />

      {/* Hero */}
      <section className="relative pt-16 pb-24 text-center px-6">
        <div className="mx-auto max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-gleam/30 bg-gleam/5 px-4 py-1.5 text-xs font-medium text-gleam mb-8">
            For apartment buildings
          </div>
          <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
            A premium amenity.<br />
            <span className="gleam-text">Completely free.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-ink-300">
            Give your residents a convenient car wash service — powered by a local operator —
            without adding a line item to your budget.
          </p>
          <div className="mt-10">
            <Link href="/signup?role=building_manager" className="btn-primary px-8 py-3 text-base">
              Add your building →
            </Link>
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {[
            {
              icon: '🆓',
              title: 'Free. Always.',
              body: 'Buildings pay nothing. Not now, not later. Lavo is funded by residents through a small transaction fee on each booking.',
            },
            {
              icon: '⚡',
              title: 'Live in 5 minutes',
              body: 'Enter your building address, get a QR code. Post it in the lobby. Done. Residents can start signing up immediately.',
            },
            {
              icon: '📊',
              title: 'One stat a month',
              body: 'Your dashboard shows total washes booked and resident adoption — a clean number to show leadership, no effort required.',
            },
            {
              icon: '🤝',
              title: 'We handle the operator',
              body: "Browse local car wash operators, send a partnership request, and they handle the schedule. You're not managing anything.",
            },
            {
              icon: '📱',
              title: 'Residents love it',
              body: 'No app download. Residents scan your QR, sign up in under a minute, and book washes from any browser.',
            },
            {
              icon: '🔒',
              title: 'Insurance you can show leadership',
              body: "Every operator carries general liability and commercial auto insurance, with a COI on file naming your building as additional insured.",
            },
          ].map((item) => (
            <div key={item.title} className="card p-6">
              <div className="text-3xl mb-3">{item.icon}</div>
              <h3 className="font-display text-xl mb-2">{item.title}</h3>
              <p className="text-sm text-ink-300 leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Steps */}
      <section className="mx-auto max-w-3xl px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="font-display text-4xl">How it works for buildings</h2>
        </div>
        <ol className="space-y-6">
          {[
            ['Enter your building address', 'Takes 60 seconds. We auto-generate a branded landing page and QR code for your building.'],
            ['Browse nearby car washes', 'See local operators within your building\'s radius. Review prices, ratings, and services.'],
            ['Request a partnership', 'Pick an operator and send a request. They accept, and the partnership goes live instantly.'],
            ['Share the QR code', 'Post it in your lobby, elevator, or parking area. Include the link in your resident newsletter.'],
            ['Residents book and pay', 'Residents sign up through your link and book washes directly. You\'re not involved.'],
            ['Watch the stat grow', 'Check your dashboard once a month. That\'s all you need to do.'],
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

      <section className="mx-auto max-w-4xl px-6 py-16">
        <EnterpriseLeadForm />
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-6 py-20">
        <h2 className="font-display text-4xl mb-10 text-center">Common questions</h2>
        <div className="space-y-6">
          {[
            ['Does Lavo cost the building anything?', 'No. Buildings pay nothing now and nothing ever. Lavo is funded entirely by a 15–20% transaction fee on resident bookings.'],
            ['Do I need to manage the car wash relationship?', 'No. You select a car wash once. If you ever want to switch, just request a new partner from the marketplace.'],
            ['What if residents have issues with a wash?', 'Residents contact the operator directly through the platform.'],
            ['How many buildings can I manage?', 'As many as you like. Each building gets its own dashboard, link, and QR code.'],
            ['Is there a minimum unit count?', 'No minimum. A building with 10 units and one with 300 get the same free service.'],
          ].map(([q, a]) => (
            <div key={String(q)} className="card p-6">
              <div className="font-medium">{q}</div>
              <p className="mt-2 text-sm text-ink-300">{a}</p>
            </div>
          ))}
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
