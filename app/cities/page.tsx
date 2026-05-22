import Link from 'next/link';
import { ContentPageShell } from '@/components/marketing/ContentPageShell';
import { JsonLd } from '@/components/seo/JsonLd';
import { SeoPageHeader } from '@/components/marketing/SeoPageHeader';
import { CITIES } from '@/lib/seo/cities';
import { breadcrumbSchema } from '@/lib/seo/schema';
import { createPageMetadata } from '@/lib/seo/site';

export const metadata = createPageMetadata({
  path: '/cities',
  title: 'Lavo Cities | Apartment Mobile Car Wash Locations',
  description:
    'Explore where Lavo helps apartment residents book mobile car washes from their building garage or parking area.',
});

export default function CitiesIndexPage() {
  return (
    <ContentPageShell>
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Cities', path: '/cities' },
        ])}
      />
      <SeoPageHeader
        h1="Lavo Cities"
        opening="Lavo is building apartment mobile car wash programs for residents, buildings, and operators across key local markets."
      />
      <ul className="grid gap-4 sm:grid-cols-2">
        {CITIES.map((city) => (
          <li key={city.slug}>
            <Link
              href={`/cities/${city.slug}`}
              className="card block p-6 transition-colors hover:border-white/15"
            >
              <h2 className="font-display text-lg text-ink-100">{city.h1}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-400">{city.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </ContentPageShell>
  );
}
