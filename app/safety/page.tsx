import Link from 'next/link';
import { ContentPageShell } from '@/components/marketing/ContentPageShell';
import { CtaBlock } from '@/components/marketing/CtaBlock';
import { JsonLd } from '@/components/seo/JsonLd';
import { RelatedLinks } from '@/components/marketing/RelatedLinks';
import { SeoPageHeader } from '@/components/marketing/SeoPageHeader';
import { SeoSection } from '@/components/marketing/SeoSection';
import { breadcrumbSchema } from '@/lib/seo/schema';
import { createPageMetadata } from '@/lib/seo/site';

export const metadata = createPageMetadata({
  path: '/safety',
  title: 'Safety, Vetting, and Building Readiness | Lavo',
  description:
    'Learn how Lavo approaches operator vetting, building access, insurance documentation, resident communication, and issue handling.',
});

const RELATED = [
  { href: '/buildings', label: 'For properties' },
  { href: '/operators', label: 'For operators' },
  { href: '/contact', label: 'Contact' },
  { href: '/resources/car-wash-amenity-insurance-damage', label: 'Insurance and damage handling' },
];

export default function SafetyPage() {
  return (
    <ContentPageShell>
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Safety', path: '/safety' },
        ])}
      />
      <SeoPageHeader
        h1="Safety, Vetting, and Building Readiness"
        opening="Lavo is designed to help apartment buildings offer mobile car wash service with a clear process for operator vetting, building access, resident communication, and issue handling."
      />
      <SeoSection
        title="Vetted operators"
        paragraphs={[
          'Lavo works with mobile car wash operators who are reviewed before being added to the platform.',
          'Onboarding includes service profile review and compliance steps before a building partnership goes live.',
        ]}
      />
      <SeoSection
        title="Building coordination"
        paragraphs={[
          'Lavo helps buildings define when and where wash days happen, how residents book, and how operators access the approved service area.',
          'Access instructions are shared with operators so front desk teams are not guessing about vendor rules.',
        ]}
      />
      <SeoSection
        title="Insurance and documentation"
        paragraphs={[
          'When required by a building, Lavo can coordinate documentation requests such as insurance certificates or building specific requirements.',
          'Property teams should still review certificates against their standards before approving garage access.',
        ]}
      />
      <SeoSection
        title="Damage and issue handling"
        paragraphs={[
          'If a resident reports an issue, Lavo collects details, photos, booking information, and operator context so the issue can be reviewed clearly.',
          'Resident-facing steps and review timelines are described in the damage policy linked below.',
        ]}
      />
      <p className="mb-10 text-sm text-ink-300">
        <Link href="/legal/damage-policy" className="text-gleam hover:underline">
          Read the Lavo damage policy
        </Link>
      </p>
      <div className="mb-10">
        <CtaBlock label="Talk to Lavo" href="/contact" />
      </div>
      <RelatedLinks links={RELATED} title="Related pages" />
    </ContentPageShell>
  );
}
