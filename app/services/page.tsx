import Link from 'next/link';
import { MarketingNav } from '@/components/MarketingNav';
import { RelatedLinks } from '@/components/marketing/RelatedLinks';
import { VisibleFaq } from '@/components/marketing/VisibleFaq';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbSchema, faqPageSchema, serviceSchema } from '@/lib/seo/schema';
import { createPageMetadata } from '@/lib/seo/site';

export const metadata = createPageMetadata({
  path: '/services',
  title: 'Car Wash Services for Apartment Residents | Lavo',
  description:
    "See the wash and detailing options available through Lavo, from a basic exterior wash to wax, interior detail, and tire shine. Exact options and pricing are set by your building's operator.",
});

const SERVICES_RELATED = [
  { href: '/residents', label: 'For residents' },
  { href: '/buildings', label: 'For properties' },
  { href: '/operators', label: 'For operators' },
  { href: '/how-it-works', label: 'How it works' },
];

const SERVICES = [
  {
    name: 'Exterior wash',
    body: 'The base of every Lavo booking. A full exterior wash at your building, either on a scheduled wash day (usually cheaper) or an on demand open slot whenever your operator has capacity.',
  },
  {
    name: 'Wax and ceramic protection',
    body: 'A protective layer added on top of the exterior wash. Helps your car shed rain, resist road salt and grime, and hold a shine longer between washes.',
  },
  {
    name: 'Interior detail',
    body: 'Vacuuming, wipe down, and a deeper clean of the cabin. Good for residents who want more than an exterior refresh without booking a separate detailer.',
  },
  {
    name: 'Tire shine',
    body: 'A finishing touch applied to your tires for a clean, uniform look. Usually added on top of a base wash rather than booked on its own.',
  },
];

const SERVICES_FAQ = [
  {
    question: 'Does every operator offer these services?',
    answer:
      "No. Operators set their own menu, so not every add-on is available at every building. You'll always see what your building's operator offers before you book.",
  },
  {
    question: "How do I know what's included before I book?",
    answer:
      'Every price and service option is shown up front in the booking flow for your specific building. There are no surprises after you confirm.',
  },
  {
    question: "Can I add a service after I've already booked a basic wash?",
    answer:
      "That depends on your operator's process. Some allow it, some ask you to book the add-on up front. Check your booking confirmation or ask your operator directly.",
  },
  {
    question: 'Is pricing the same across every building?',
    answer:
      'No. Pricing is set locally by each operator, so it can vary by building and by market.',
  },
];

export default function ServicesPage() {
  return (
    <main className="relative">
      <JsonLd
        data={[
          serviceSchema({
            path: '/services',
            name: 'Car wash and detailing services for apartment residents',
            serviceType: 'Mobile car wash and detailing for apartment buildings',
            description:
              'Wash and detailing options available through Lavo, from a basic exterior wash to wax, interior detail, and tire shine. Exact options and pricing are set by the operator serving each building.',
            audience: 'Apartment and condo residents',
            areaServed: 'New Jersey',
            offerCatalog: {
              name: 'Wash services',
              items: SERVICES.map((service) => service.name),
            },
          }),
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Services', path: '/services' },
          ]),
          faqPageSchema('/services', SERVICES_FAQ),
        ]}
      />
      <div className="absolute inset-x-0 top-0 h-[500px] bg-gleam-fade" />
      <MarketingNav />

      {/* Hero */}
      <section className="relative pt-16 pb-24 text-center px-6">
        <div className="mx-auto max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-gleam/30 bg-gleam/5 px-4 py-1.5 text-xs font-medium text-gleam mb-8">
            Wash and detailing options
          </div>
          <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
            Every wash,<br />
            <span className="gleam-text">plus a few extras.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-ink-300">
            Book a basic wash or add extras like wax, an interior detail, or tire shine, all from
            your building. Exact options and pricing are set by the operator serving your building
            and shown before you confirm.
          </p>
          <div className="mt-10">
            <Link href="/cities" className="btn-primary px-8 py-3 text-base">
              Check your building →
            </Link>
          </div>
        </div>
      </section>

      {/* Service menu */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {SERVICES.map((service) => (
            <div key={service.name} className="card p-6">
              <h2 className="font-display text-xl mb-2">{service.name}</h2>
              <p className="text-sm text-ink-300 leading-relaxed">{service.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-3xl px-6 py-20">
        <h2 className="font-display text-4xl mb-8 text-center">How pricing works</h2>
        <div className="card p-8 space-y-5">
          <p className="text-sm leading-relaxed text-ink-200">
            Every operator on Lavo sets their own rates and menu. Wash day slots are typically
            priced lower than on demand bookings, and add-ons like wax or an interior detail cost
            more than a basic wash alone. You always see the exact price for your building&apos;s
            operator before you confirm, the same way you do for the base wash.
          </p>
          <p className="border-t border-white/10 pt-5 text-sm leading-relaxed text-ink-300">
            Not every operator offers every add-on. If a service is not available at your building
            yet, you&apos;ll see that before you book, not after.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-6 py-20">
        <VisibleFaq title="Frequently asked questions" items={[...SERVICES_FAQ]} />
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-8">
        <RelatedLinks links={SERVICES_RELATED} />
      </section>

    </main>
  );
}
