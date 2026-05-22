import Link from 'next/link';
import { ContentPageShell } from '@/components/marketing/ContentPageShell';
import { JsonLd } from '@/components/seo/JsonLd';
import { SeoPageHeader } from '@/components/marketing/SeoPageHeader';
import { RESOURCES } from '@/lib/seo/resources';
import { breadcrumbSchema } from '@/lib/seo/schema';
import { createPageMetadata } from '@/lib/seo/site';

export const metadata = createPageMetadata({
  path: '/resources',
  title: 'Lavo Resources | Apartment Mobile Car Wash Guides',
  description:
    'Read Lavo guides for apartment residents, property managers, and mobile car wash operators.',
});

export default function ResourcesIndexPage() {
  return (
    <ContentPageShell>
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Resources', path: '/resources' },
        ])}
      />
      <SeoPageHeader
        h1="Lavo Resources"
        opening="Guides for apartment residents, property managers, and mobile car wash operators who want to understand how apartment mobile car wash programs work."
      />
      <ul className="grid gap-4 sm:grid-cols-2">
        {RESOURCES.map((resource) => (
          <li key={resource.slug}>
            <Link
              href={`/resources/${resource.slug}`}
              className="card block p-6 transition-colors hover:border-white/15"
            >
              <h2 className="font-display text-lg text-ink-100">{resource.h1}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-400">{resource.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </ContentPageShell>
  );
}
