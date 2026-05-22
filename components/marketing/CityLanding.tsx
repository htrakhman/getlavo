import Link from 'next/link';
import { JsonLd } from '@/components/seo/JsonLd';
import { CtaBlock } from '@/components/marketing/CtaBlock';
import { RelatedLinks, type RelatedLink } from '@/components/marketing/RelatedLinks';
import { SeoPageHeader } from '@/components/marketing/SeoPageHeader';
import { SeoSection } from '@/components/marketing/SeoSection';
import { VisibleFaq } from '@/components/marketing/VisibleFaq';
import { breadcrumbSchema, serviceSchema } from '@/lib/seo/schema';
import type { CityPage } from '@/lib/seo/cities';

const CITY_RELATED_LINKS: RelatedLink[] = [
  { href: '/buildings', label: 'For properties' },
  { href: '/operators', label: 'For operators' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/resources/mobile-car-wash-apartment-garage', label: 'Mobile car wash in apartment garages' },
  { href: '/resources/apartment-car-wash-amenity', label: 'Apartment car wash amenity' },
];

export function CityLanding({ city }: { city: CityPage }) {
  const path = `/cities/${city.slug}`;

  return (
    <>
      <JsonLd
        data={[
          serviceSchema({
            path,
            name: `Mobile car wash for apartments in ${city.localName}`,
            serviceType: 'Mobile car wash for apartment buildings',
            description: city.opening,
            audience: 'Apartment residents and property managers',
            areaServed: city.localName,
          }),
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Cities', path: '/cities' },
            { name: city.localName, path },
          ]),
        ]}
      />
      <SeoPageHeader h1={city.h1} opening={city.opening} />
      <SeoSection
        title={`Mobile car wash for apartments in ${city.localName}`}
        paragraphs={city.mobileCarWash}
      />
      <SeoSection title="How Lavo works for residents" paragraphs={city.residents} />
      <SeoSection title="How Lavo works for apartment buildings" paragraphs={city.buildings} />
      <SeoSection title="Why property managers add Lavo" paragraphs={city.propertyManagers} />
      <SeoSection title={`Operator availability in ${city.localName}`} paragraphs={city.operators} />
      <VisibleFaq items={city.faqs} />
      <SeoSection title="Request Lavo at your building" paragraphs={city.request} />
      <div className="mb-10">
        <CtaBlock label="Bring Lavo to your building" href="/buildings" />
      </div>
      <RelatedLinks links={CITY_RELATED_LINKS} />
      {city.slug !== 'new-jersey' ? (
        <p className="text-sm text-ink-400">
          Also see{' '}
          <Link href="/cities/new-jersey" className="text-gleam hover:underline">
            Lavo in New Jersey
          </Link>
          .
        </p>
      ) : null}
    </>
  );
}
