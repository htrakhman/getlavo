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
  path: '/about',
  title: 'About Lavo | Apartment Mobile Car Wash Platform',
  description:
    'Learn what Lavo is, who it serves, and why it is building a better way for apartment residents to book mobile car washes without leaving home.',
});

const ABOUT_RELATED = [
  { href: '/buildings', label: 'For properties' },
  { href: '/operators', label: 'For operators' },
  { href: '/residents', label: 'For residents' },
  { href: '/safety', label: 'Safety' },
  { href: '/contact', label: 'Contact' },
];

export default function AboutPage() {
  return (
    <ContentPageShell>
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'About', path: '/about' },
        ])}
      />
      <SeoPageHeader
        h1="About Lavo"
        opening="Lavo is building a better way for apartment residents to take care of their cars without leaving home. The platform connects residents, apartment buildings, and vetted mobile car wash operators so buildings can offer a convenient resident amenity without managing the service themselves."
      />
      <SeoSection
        title="What Lavo does"
        paragraphs={[
          'Lavo lets residents book mobile car washes from their phone, helps buildings offer a no cost amenity, and gives mobile car wash operators access to recurring local demand.',
        ]}
      />
      <SeoSection
        title="Who Lavo serves"
        paragraphs={[
          'Lavo is built for three groups: residents who want convenience, apartment buildings that want simple resident amenities, and mobile car wash operators that want predictable bookings.',
        ]}
      />
      <SeoSection
        title="Why we are building it"
        paragraphs={[
          'Car ownership in apartment buildings is inconvenient. Residents often need to leave their building, wait at a car wash, or coordinate with a random provider. Lavo makes the process easier by bringing vetted operators directly to apartment garages and parking areas.',
        ]}
      />
      <div className="mb-10">
        <CtaBlock label="Bring Lavo to your building" href="/buildings" />
      </div>
      <RelatedLinks links={ABOUT_RELATED} />
      <p className="mt-6 text-sm text-ink-400">
        Questions? Email{' '}
        <Link href="mailto:harold@getlavo.io" className="text-gleam hover:underline">
          harold@getlavo.io
        </Link>
        .
      </p>
    </ContentPageShell>
  );
}
