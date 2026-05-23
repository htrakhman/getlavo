import Link from 'next/link';
import { JsonLd } from '@/components/seo/JsonLd';
import type { CountyPageViewModel } from '@/lib/seo/cities/build-county-page';
import {
  breadcrumbSchema,
  faqPageSchema,
  jsonLdGraph,
  organizationSchema,
  serviceSchema,
  webPageSchema,
} from '@/lib/seo/schema';
import { PropertyTypesTable } from './PropertyTypesTable';
import { SeoContentSection } from './SeoContentSection';
import { CityCtaBand } from './CityCtaBand';
import { CityFaqAccordion } from './CityFaqAccordion';

export function CountyPageTemplate({ page }: { page: CountyPageViewModel }) {
  const path = page.meta.canonicalPath;
  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Cities', path: '/cities' },
    { name: `${page.county} County`, path },
  ];

  const graph = jsonLdGraph([
    organizationSchema(),
    webPageSchema({ path, name: page.h1, description: page.meta.description }),
    breadcrumbSchema(breadcrumbs),
    serviceSchema({
      path,
      name: `Mobile car wash for apartments in ${page.county} County`,
      serviceType: 'Mobile car wash and detailing for apartment buildings',
      description: page.meta.description,
      audience: 'Apartment residents and property managers',
      areaServed: `${page.county} County, New Jersey`,
    }),
    faqPageSchema(path, page.faqs),
  ]);

  return (
    <>
      <JsonLd data={graph} />
      <header className="mb-10">
        <h1 className="font-display text-3xl leading-tight text-ink-50 sm:text-4xl">{page.h1}</h1>
        <p className="mt-4 text-base leading-relaxed text-ink-200">{page.meta.description}</p>
      </header>
      <SeoContentSection title={page.overview.title} paragraphs={page.overview.paragraphs} />
      <PropertyTypesTable
        title={page.propertyTypes.title}
        rows={page.propertyTypes.rows}
      />
      {page.topCities.length > 0 ? (
        <section className="mb-10">
          <h2 className="font-display text-2xl text-ink-100">Top cities in {page.county} County</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {page.topCities.map((c) => (
              <li key={c.slug}>
                <Link href={`/cities/${c.slug}`} className="chip hover:border-gleam/40 hover:text-gleam">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <SeoContentSection
        title={page.residentSection.title}
        paragraphs={page.residentSection.paragraphs}
      />
      <SeoContentSection
        title={page.propertySection.title}
        paragraphs={page.propertySection.paragraphs}
      />
      <CityCtaBand
        label="Launch Lavo at My Property"
        href="/signup?role=building_manager"
        ctaType="city_page_property_manager_click"
        citySlug={page.countySlug}
        countySlug={page.countySlug}
      />
      <SeoContentSection
        title={page.operatorSection.title}
        paragraphs={page.operatorSection.paragraphs}
      />
      <section className="mb-10">
        <h2 className="font-display text-2xl text-ink-100">
          Cities served in {page.county} County
        </h2>
        <ul className="mt-4 columns-2 gap-x-6 text-sm sm:columns-3">
          {page.cities.map((c) => (
            <li key={c.slug} className="mb-2 break-inside-avoid">
              <Link href={`/cities/${c.slug}`} className="text-gleam hover:underline">
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <CityFaqAccordion
        title={`FAQs about mobile car wash service in ${page.county} County`}
        items={page.faqs}
        citySlug={page.countySlug}
        countySlug={page.countySlug}
      />
      <section className="mb-10">
        <h2 className="font-display text-2xl text-ink-100">Related Lavo resources</h2>
        <ul className="mt-4 space-y-2 text-sm">
          {page.relatedLinks.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="text-gleam hover:underline">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
