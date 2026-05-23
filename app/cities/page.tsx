import Link from 'next/link';
import { CitiesIndexFilter } from '@/components/marketing/CitiesIndexFilter';
import { ContentPageShell } from '@/components/marketing/ContentPageShell';
import { JsonLd } from '@/components/seo/JsonLd';
import { SeoPageHeader } from '@/components/marketing/SeoPageHeader';
import { getCountiesGrouped, getMunicipalityCities } from '@/lib/seo/cities';
import { breadcrumbSchema } from '@/lib/seo/schema';
import { createPageMetadata } from '@/lib/seo/site';

export const metadata = createPageMetadata({
  path: '/cities',
  title: 'Lavo Cities | Apartment Mobile Car Wash Locations',
  description:
    'Explore where Lavo helps apartment residents book mobile car washes across all New Jersey municipalities — every city, township, borough, town, and village.',
});

export default function CitiesIndexPage() {
  const municipalityPages = getMunicipalityCities();
  const pageBySlug = new Map(municipalityPages.map((c) => [c.slug, c]));

  const counties = getCountiesGrouped().map((group) => ({
    county: group.county,
    countySlug: group.countySlug,
    cities: group.municipalities.map((m) => {
      const page = pageBySlug.get(m.slug);
      return {
        slug: m.slug,
        localName: page?.localName ?? m.name,
        county: m.county,
        countySlug: m.countySlug,
      };
    }),
  }));

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
        opening="Lavo is building apartment mobile car wash programs for residents, buildings, and operators across every municipality in New Jersey."
      />
      <div className="mb-10">
        <Link
          href="/cities/new-jersey"
          className="card block p-6 transition-colors hover:border-white/15"
        >
          <h2 className="font-display text-lg text-ink-100">
            Mobile Car Wash for Apartment Buildings in New Jersey
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-400">
            Statewide overview for property managers, residents, and operators.
          </p>
        </Link>
      </div>
      <CitiesIndexFilter counties={counties} />
    </ContentPageShell>
  );
}
