import { MarketingNav, MarketingFooter } from '@/components/MarketingNav';
import { ForBuildingsAndTeams } from '@/components/marketing/how-it-works/ForBuildingsAndTeams';
import { FourStepGrid } from '@/components/marketing/how-it-works/FourStepGrid';
import { ProcessReassurance } from '@/components/marketing/how-it-works/ProcessReassurance';
import { ResidentFinalCta } from '@/components/marketing/how-it-works/ResidentFinalCta';
import { ResidentHero } from '@/components/marketing/how-it-works/ResidentHero';
import { RelatedLinks } from '@/components/marketing/RelatedLinks';
import { VisibleFaq } from '@/components/marketing/VisibleFaq';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbSchema } from '@/lib/seo/schema';
import { createPageMetadata } from '@/lib/seo/site';

export const metadata = createPageMetadata({
  path: '/how-it-works',
  title: 'How Apartment Car Wash Works | Lavo',
  description:
    'Book a car wash from your phone. A vetted team comes to your building, washes your car, and notifies you when it’s done.',
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
      'Usually not. Your building’s access process is followed, so the wash can happen while you go about your day.',
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

      <ResidentHero />
      <FourStepGrid />
      <ProcessReassurance />
      <ForBuildingsAndTeams />
      <ResidentFinalCta />

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
