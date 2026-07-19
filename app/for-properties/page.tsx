import Link from 'next/link';
import { MarketingNav } from '@/components/MarketingNav';
import { RelatedLinks } from '@/components/marketing/RelatedLinks';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbSchema, serviceSchema } from '@/lib/seo/schema';
import { createPageMetadata } from '@/lib/seo/site';

export const metadata = createPageMetadata({
  path: '/for-properties',
  title: 'Add a Free Car Wash Amenity for Your Residents | Lavo',
  description:
    'Lavo gives apartment residents on-demand mobile car wash access at their building. Free for properties. No contract, no staff time, no cost.',
});

const RELATED = [
  {
    title: 'Resources',
    links: [
      { href: '/how-it-works', label: 'How it works' },
      { href: '/buildings', label: 'For properties' },
      { href: '/cities', label: 'Coverage map' },
      { href: '/about', label: 'About Lavo' },
    ],
  },
];

const WHY_LAVO = [
  {
    title: 'Free for your building',
    body: 'Lavo never charges the property. Residents pay operators directly online through your building link.',
  },
  {
    title: 'Zero management overhead',
    body: 'We handle operator vetting, scheduling, payments, and service coordination.',
  },
  {
    title: 'Launch materials included',
    body: 'QR codes, flyer copy, email copy, and resident announcement language — all ready to send.',
  },
];

const HOW_IT_WORKS = [
  [
    'You sign up',
    'Takes 5 minutes. Tell us your building name, address, and parking setup.',
  ],
  [
    'We match you with a vetted operator',
    'A background-checked mobile wash crew is approved for your property.',
  ],
  [
    'You share the booking link',
    'Send residents a QR code, building-specific URL, or use our email template.',
  ],
  [
    'Residents book and pay on their own',
    'You get a monthly recap. Nothing else is required from you.',
  ],
] as const;

const WHAT_YOU_GET = [
  {
    title: 'Custom resident booking link',
    body: 'A shareable URL tied to your property. Residents see only operators approved for your building.',
  },
  {
    title: 'Launch kit',
    body: 'Ready-to-use QR code, flyer PDF, email copy, and resident announcement language.',
  },
  {
    title: 'Operator coordination',
    body: "Lavo manages vetting, scheduling, insurance, and service flow. You're not in the loop until you want to be.",
  },
  {
    title: 'Monthly amenity recap',
    body: 'A one-page summary of wash activity — useful for resident newsletters and renewal conversations.',
  },
];

const FAQ = [
  [
    'Does this cost my building anything?',
    'No. Lavo is free for properties. Residents pay operators directly online. The building is never invoiced.',
  ],
  [
    'What if we already have a car wash vendor?',
    'Lavo works alongside existing arrangements. You can start with one wash day per month and expand if residents want more.',
  ],
  [
    'How long does setup take?',
    'About 5 minutes to register. We handle operator matching and send you launch materials within a few business days.',
  ],
] as const;

export default function ForPropertiesPage() {
  return (
    <main className="relative">
      <JsonLd
        data={[
          serviceSchema({
            path: '/for-properties',
            name: 'Free car wash amenity for apartment buildings',
            serviceType: 'Mobile car wash amenity for property managers',
            description:
              'Lavo gives apartment residents on-demand mobile car wash access at their building. Free for properties.',
            audience: 'Property managers and community managers',
            price: 0,
          }),
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'For property managers', path: '/for-properties' },
          ]),
        ]}
      />
      <div className="absolute inset-x-0 top-0 h-[600px] bg-gleam-fade" />
      <MarketingNav />

      {/* Hero */}
      <section className="relative mx-auto max-w-6xl px-6 pt-16 pb-20">
        <p className="text-xs uppercase tracking-[0.18em] text-gleam mb-4">For property managers</p>
        <h1 className="font-display text-5xl font-semibold tracking-tight md:text-6xl max-w-3xl">
          A car wash amenity your residents will love — at zero cost to you
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-ink-300">
          Add Lavo to your building in 5 minutes. Residents book and pay directly. You do nothing after
          setup.
        </p>
        <div className="mt-10">
          <Link href="/signup?role=building_manager" className="btn-primary px-8 py-3 text-base">
            Get your building link →
          </Link>
          <a
            href="#how-it-works"
            className="mt-4 block text-sm text-gleam transition-colors hover:text-gleam-300"
          >
            See how it works ↓
          </a>
        </div>
      </section>

      {/* Why Lavo */}
      <section className="relative mx-auto max-w-6xl border-t border-white/10 px-6 py-20">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {WHY_LAVO.map((item) => (
            <div key={item.title} className="card p-6">
              <h3 className="font-display text-xl mb-2">{item.title}</h3>
              <p className="text-sm text-ink-300 leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="relative mx-auto max-w-6xl border-t border-white/10 px-6 py-20 scroll-mt-8"
      >
        <h2 className="font-display text-4xl mb-12">How it works for your building</h2>
        <ol className="grid grid-cols-1 gap-6 md:grid-cols-2 max-w-4xl">
          {HOW_IT_WORKS.map(([title, body], i) => (
            <li key={title} className="flex gap-6 items-start">
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

      {/* What you get */}
      <section className="relative mx-auto max-w-6xl border-t border-white/10 px-6 py-20">
        <div className="card bg-ink-900/85 p-6 sm:p-8 max-w-3xl">
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-gleam mb-5">What you get</div>
          <div className="divide-y divide-white/15">
            {WHAT_YOU_GET.map((item, index) => (
              <div key={item.title} className={index === 0 ? 'pb-5' : 'py-5'}>
                <div className="text-sm font-medium text-ink-100">{item.title}</div>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-300">{item.body}</p>
              </div>
            ))}
            <p className="pt-5 text-xs leading-relaxed text-ink-400">
              No building cost. No contract. No staff training required.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative mx-auto max-w-6xl border-t border-white/10 px-6 py-20">
        <h2 className="font-display text-4xl mb-10">Common questions</h2>
        <div className="max-w-3xl space-y-6">
          {FAQ.map(([q, a]) => (
            <div key={q} className="card p-6">
              <div className="font-medium">{q}</div>
              <p className="mt-2 text-sm text-ink-300">{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative mx-auto max-w-6xl border-t border-white/10 px-6 py-20">
        <div className="card p-10 text-center">
          <h2 className="font-display text-3xl md:text-4xl">Ready to add Lavo to your building?</h2>
          <p className="mt-4 text-ink-300 max-w-xl mx-auto">
            It takes 5 minutes. No credit card. No contract. No cost to the property.
          </p>
          <div className="mt-8">
            <Link href="/signup?role=building_manager" className="btn-primary px-8 py-3 text-base">
              Get your building link →
            </Link>
          </div>
          <Link href="/contact" className="mt-4 inline-block text-sm text-ink-400 hover:text-gleam transition-colors">
            Questions? Contact us
          </Link>
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-6 pb-8">
        <RelatedLinks groups={RELATED} title="Resources" />
      </section>
    </main>
  );
}
