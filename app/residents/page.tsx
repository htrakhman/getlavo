import Link from 'next/link';
import { MarketingNav } from '@/components/MarketingNav';
import { RelatedLinks } from '@/components/marketing/RelatedLinks';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbSchema, serviceSchema } from '@/lib/seo/schema';
import { createPageMetadata } from '@/lib/seo/site';

export const metadata = createPageMetadata({
  path: '/residents',
  title: 'Mobile Car Wash for Apartment Residents | Lavo',
  description:
    'Book a mobile car wash from your apartment building garage or parking spot. See prices upfront, pay online, and get notified when your wash is done.',
});

const RESIDENTS_RELATED = [
  { href: '/how-it-works', label: 'How it works' },
  { href: '/help', label: 'Help' },
  { href: '/safety', label: 'Safety' },
  { href: '/buildings', label: 'For properties' },
  { href: '/operators', label: 'For operators' },
  { href: '/cities/new-jersey', label: 'New Jersey' },
];

export default function ResidentsPage() {
  return (
    <main className="relative">
      <JsonLd
        data={[
          serviceSchema({
            path: '/residents',
            name: 'Mobile car wash for apartment residents',
            serviceType: 'In-building mobile car wash booking for residents',
            description:
              'Residents book vetted operators at their building, pay online, and get a photo when the wash is complete.',
            audience: 'Apartment and condo residents',
          }),
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'For residents', path: '/residents' },
          ]),
        ]}
      />
      <div className="absolute inset-x-0 top-0 h-[500px] bg-gleam-fade" />
      <MarketingNav />

      <section className="relative pt-16 pb-24 text-center px-6">
        <div className="mx-auto max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-gleam/30 bg-gleam/5 px-4 py-1.5 text-xs font-medium text-gleam mb-8">
            For apartment residents
          </div>
          <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
            Clean car,<br />
            <span className="gleam-text">zero effort.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-ink-300">
            Book and pay from your phone. Operators your building already trusts, with prices shown before you confirm.
          </p>
          <div className="mt-10">
            <Link href="/signup?role=resident" className="btn-primary px-8 py-3 text-base">
              Sign up as a resident →
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {[
            {
              title: 'Operators at your building',
              body: 'Only see operators within your building\'s radius — no browsing random listings. Your property partners with vetted local pros.',
            },
            {
              title: 'Wash day or on-demand',
              body: 'Book a building wash day slot (usually cheaper) or grab an open on-demand slot any day your operator has capacity.',
            },
            {
              title: 'Pay online',
              body: 'No cash, no Venmo, no awkward conversations. Every price is shown before you confirm.',
            },
            {
              title: 'Done when you get the photo',
              body: 'Get notified when your wash is complete with a photo. Leave a review from your phone in seconds.',
            },
          ].map((item) => (
            <div key={item.title} className="card p-6">
              <h3 className="font-display text-xl mb-2">{item.title}</h3>
              <p className="text-sm text-ink-300 leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="font-display text-4xl">How it works for residents</h2>
        </div>
        <ol className="space-y-6">
          {[
            ['Join your building', 'Scan the QR code in your lobby or use the link from your property manager. Sign up in under a minute.'],
            ['Add your vehicle', 'Enter make, model, color, and where you park — garage level, spot number, or street instructions.'],
            ['Pick a slot', 'Choose a building wash day or an on-demand open slot. See the exact price before you book.'],
            ['Pay and relax', 'Pay securely online. Get a notification and photo when your wash is done.'],
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

      <section className="mx-auto max-w-3xl px-6 py-20">
        <div className="rounded-2xl border border-white/15 bg-ink-900/85 p-8 shadow-card backdrop-blur-xl ring-1 ring-inset ring-white/[0.06] space-y-5">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-gleam">Building wash day</div>
            <p className="mt-2 text-sm leading-relaxed text-ink-200">
              Scheduled visit — operators set their own rate for partnered buildings. You always see the exact price before booking.
            </p>
          </div>
          <div className="border-t border-white/15 pt-5">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-gleam">On-demand slot</div>
            <p className="mt-2 text-sm leading-relaxed text-ink-200">
              Book any available date. Price is set by the operator and shown upfront.
            </p>
          </div>
          <p className="text-xs leading-relaxed text-ink-400">
            Add wax, interior detail, or tire shine as a one-tap upgrade when your operator offers extras.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h2 className="font-display text-4xl mb-4">Your building not on Lavo yet?</h2>
        <p className="text-ink-300 mb-8">
          Ask your property manager to add Lavo, or check if your address is already live.
        </p>
        <Link href="/" className="btn-primary px-10 py-4 text-base">
          Check your building →
        </Link>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-8">
        <RelatedLinks links={RESIDENTS_RELATED} />
      </section>

    </main>
  );
}
