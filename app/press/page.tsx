import Link from 'next/link';
import { ContentPageShell } from '@/components/marketing/ContentPageShell';
import { JsonLd } from '@/components/seo/JsonLd';
import { SeoPageHeader } from '@/components/marketing/SeoPageHeader';
import { SeoSection } from '@/components/marketing/SeoSection';
import { breadcrumbSchema } from '@/lib/seo/schema';
import { createPageMetadata } from '@/lib/seo/site';

export const metadata = createPageMetadata({
  path: '/press',
  title: 'Lavo Press Kit | Company Info, Brand Assets, and Media Contact',
  description:
    'Learn about Lavo, the apartment mobile car wash platform for residents, buildings, and vetted car wash operators.',
});

export default function PressPage() {
  return (
    <ContentPageShell>
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Press', path: '/press' },
        ])}
      />
      <SeoPageHeader
        h1="Lavo Press Kit"
        opening="Lavo is an apartment mobile car wash platform for residents, property managers, and mobile car wash operators."
      />
      <SeoSection
        title="Company description"
        paragraphs={[
          'Lavo helps apartment residents book mobile car washes directly from their building garage or parking area. Buildings can offer Lavo as a no cost resident amenity, while mobile car wash operators can access recurring apartment building demand.',
        ]}
      />
      <SeoSection
        title="Who Lavo serves"
        paragraphs={[
          'Lavo serves residents, apartment buildings, property managers, and mobile car wash operators.',
        ]}
      />
      <SeoSection
        title="Media and partnerships"
        paragraphs={[
          'For press, partnerships, or general questions, contact press@getlavo.io.',
        ]}
      />
      <p className="text-sm text-ink-300">
        General support:{' '}
        <Link href="mailto:hello@getlavo.io" className="text-gleam hover:underline">
          hello@getlavo.io
        </Link>
      </p>
    </ContentPageShell>
  );
}
