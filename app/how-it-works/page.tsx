import { MarketingNav, MarketingFooter } from '@/components/MarketingNav';
import { FinalCtaGrid } from '@/components/marketing/how-it-works/FinalCtaGrid';
import { FourStepGrid } from '@/components/marketing/how-it-works/FourStepGrid';
import { RoleTabs } from '@/components/marketing/how-it-works/RoleTabs';
import { TrustTimeline } from '@/components/marketing/how-it-works/TrustTimeline';
import { WorkflowHero } from '@/components/marketing/how-it-works/WorkflowHero';
import { RelatedLinks } from '@/components/marketing/RelatedLinks';
import { VisibleFaq } from '@/components/marketing/VisibleFaq';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbSchema } from '@/lib/seo/schema';
import { createPageMetadata } from '@/lib/seo/site';

export const metadata = createPageMetadata({
  path: '/how-it-works',
  title: 'How Lavo Coordinates Apartment Car Wash Days',
  description:
    'From building launch to resident booking, operator wash day, and payout — see how Lavo coordinates apartment car wash in one simple workflow.',
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
      <div className="absolute inset-x-0 top-0 h-[500px] bg-gleam-fade" />
      <MarketingNav />

      <WorkflowHero />
      <FourStepGrid />
      <TrustTimeline />
      <RoleTabs />
      <FinalCtaGrid />

      <section className="mx-auto max-w-3xl px-6 py-10">
        <VisibleFaq items={[...FAQ]} />
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-8">
        <RelatedLinks links={HOW_IT_WORKS_RELATED} />
      </section>

      <MarketingFooter />
    </main>
  );
}
