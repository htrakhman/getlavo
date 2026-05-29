import { JsonLd } from '@/components/seo/JsonLd';
import type { CityPageViewModel } from '@/lib/seo/cities/types';
import {
  breadcrumbSchema,
  faqPageSchema,
  jsonLdGraph,
  localBusinessSchema,
  organizationSchema,
  serviceSchema,
  webPageSchema,
} from '@/lib/seo/schema';
import Link from 'next/link';
import { AtAGlanceBox } from './AtAGlanceBox';
import { CityNextSteps } from './CityNextSteps';
import { AudienceCards } from './AudienceCards';
import { CityCtaBand } from './CityCtaBand';
import { CityFaqAccordion } from './CityFaqAccordion';
import { CityFinalCta } from './CityFinalCta';
import { CityHero } from './CityHero';
import { HowItWorksFlows } from './HowItWorksFlows';
import { NearbyCitiesGrid } from './NearbyCitiesGrid';
import { ParkingChecklist } from './ParkingChecklist';
import { PropertyTypesTable } from './PropertyTypesTable';
import { RelatedResources } from './RelatedResources';
import { RequestFlowSection } from './RequestFlowSection';
import { SeoContentSection } from './SeoContentSection';
import { ServicesTable } from './ServicesTable';

export function CityPageTemplate({ page }: { page: CityPageViewModel }) {
  const path = page.meta.canonicalPath;
  const isState = page.slug === 'new-jersey';

  const breadcrumbs = isState
    ? [
        { name: 'Home', path: '/' },
        { name: 'Cities', path: '/cities' },
        { name: page.localName, path },
      ]
    : [
        { name: 'Home', path: '/' },
        { name: 'Cities', path: '/cities' },
        { name: `${page.county} County`, path: `/cities/counties/${page.countySlug}` },
        { name: page.localName, path },
      ];

  const areaServed = isState
    ? 'New Jersey'
    : { city: page.localName, state: 'New Jersey', county: page.county };

  const buildingSchemas =
    page.buildingsSection?.buildings
      .filter((b) => b.slug)
      .slice(0, 5)
      .map((b) =>
        localBusinessSchema({
          name: b.name,
          path: `/building/${b.slug}`,
          city: page.localName,
          state: 'NJ',
          county: page.county,
        }),
      ) ?? [];

  const graph = jsonLdGraph([
    organizationSchema(),
    webPageSchema({
      path,
      name: page.h1,
      description: page.meta.description,
    }),
    {
      ...breadcrumbSchema(breadcrumbs),
      '@id': `${path}#breadcrumb`,
    },
    serviceSchema({
      path,
      name: `Mobile car wash for apartment buildings in ${page.localName}`,
      serviceType: 'Mobile car wash and detailing for apartment buildings',
      description: page.hero.aeoSummary,
      audience: 'Apartment residents, property managers, and mobile wash operators',
      areaServed,
    }),
    ...buildingSchemas,
    faqPageSchema(path, page.faqs),
  ]);

  const nearbyTitle = isState
    ? 'Explore Lavo by county'
    : `Nearby Lavo city pages`;

  return (
    <>
      <JsonLd data={graph} />
      <CityHero
        h1={page.h1}
        subheadline={page.hero.subheadline}
        plainEnglish={page.hero.plainEnglish}
        trustLine={page.hero.trustLine}
        citySlug={page.slug}
        countySlug={page.countySlug}
      />
      <AtAGlanceBox
        title={`Lavo in ${page.localName} at a glance`}
        fields={page.atAGlance}
        summary={page.hero.aeoSummary}
      />
      <CityNextSteps
        cityName={page.localName}
        citySlug={page.slug}
        countySlug={page.countySlug}
      />
      <SeoContentSection
        title={page.overview.title}
        paragraphs={page.overview.paragraphs}
      />
      {page.neighborhoodsSection ? (
        <SeoContentSection
          title={page.neighborhoodsSection.title}
          paragraphs={[page.neighborhoodsSection.paragraph]}
          bullets={page.neighborhoodsSection.neighborhoods}
        />
      ) : null}
      {page.buildingsSection ? (
        <section className="mb-10">
          <h2 className="font-display text-2xl text-ink-100">{page.buildingsSection.title}</h2>
          <p className="mt-4 text-sm leading-relaxed text-ink-300">{page.buildingsSection.paragraph}</p>
          <ul className="mt-4 space-y-2 text-sm text-ink-300">
            {page.buildingsSection.buildings.map((b) => (
              <li key={b.name}>
                {b.slug ? (
                  <Link href={`/building/${b.slug}`} className="text-gleam hover:underline">
                    {b.name}
                  </Link>
                ) : (
                  b.name
                )}
                <span className="text-ink-500"> ({b.status})</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {page.operatorsSection ? (
        <SeoContentSection
          title={page.operatorsSection.title}
          paragraphs={[page.operatorsSection.paragraph]}
          bullets={page.operatorsSection.bullets}
        />
      ) : null}
      {page.schedulingSection ? (
        <SeoContentSection
          title={page.schedulingSection.title}
          paragraphs={page.schedulingSection.paragraphs}
        />
      ) : null}
      <CityCtaBand
        label="See if Lavo is available at your building"
        href="#request-lavo"
        ctaType="city_page_resident_request_click"
        citySlug={page.slug}
        countySlug={page.countySlug}
        variant="secondary"
      />
      <AudienceCards title={page.audience.title} cards={page.audience.cards} />
      <HowItWorksFlows
        title={page.howItWorks.title}
        residents={page.howItWorks.residents}
        propertyManagers={page.howItWorks.propertyManagers}
        operators={page.howItWorks.operators}
      />
      <SeoContentSection
        title={page.whyBuildings.title}
        paragraphs={page.whyBuildings.paragraphs}
        bullets={page.whyBuildings.bullets}
      />
      <PropertyTypesTable title={page.propertyTypes.title} rows={page.propertyTypes.rows} />
      <ParkingChecklist
        title={page.parking.title}
        paragraphs={page.parking.paragraphs}
        checklist={page.parking.checklist}
      />
      <SeoContentSection
        title={page.residentBenefits.title}
        paragraphs={page.residentBenefits.paragraphs}
        bullets={page.residentBenefits.bullets}
      />
      <SeoContentSection
        title={page.propertyManagerBenefits.title}
        paragraphs={page.propertyManagerBenefits.paragraphs}
        bullets={page.propertyManagerBenefits.bullets}
      />
      <CityCtaBand
        label="Add Lavo as a no cost resident amenity"
        href="/signup?role=building_manager"
        description="Property managers can launch Lavo without equipment, staff, or construction."
        ctaType="city_page_property_manager_click"
        citySlug={page.slug}
        countySlug={page.countySlug}
      />
      <ServicesTable title={page.services.title} rows={page.services.rows} />
      <SeoContentSection
        title={page.vehicleCare.title}
        paragraphs={page.vehicleCare.paragraphs}
      />
      <SeoContentSection
        title={page.operators.title}
        paragraphs={page.operators.paragraphs}
        bullets={page.operators.bullets}
      />
      <CityCtaBand
        label="Apply to Serve Lavo Buildings"
        href={`/operators/apply${page.slug && page.slug !== 'new-jersey' ? `?city=${page.slug}` : ''}`}
        ctaType="city_page_operator_signup_click"
        citySlug={page.slug}
        countySlug={page.countySlug}
        variant="secondary"
      />
      <RequestFlowSection
        title={page.requestResident.title}
        paragraphs={page.requestResident.paragraphs}
        steps={page.requestResident.steps}
      />
      <CityCtaBand
        label="Request Lavo at My Building"
        href="#request-lavo"
        ctaType="city_page_resident_request_click"
        citySlug={page.slug}
        countySlug={page.countySlug}
      />
      <RequestFlowSection
        title={page.launchProperty.title}
        paragraphs={page.launchProperty.paragraphs}
        steps={page.launchProperty.steps}
      />
      <CityCtaBand
        label="Launch Lavo at My Property"
        href="/signup?role=building_manager"
        ctaType="city_page_property_manager_click"
        citySlug={page.slug}
        countySlug={page.countySlug}
      />
      <CityFaqAccordion
        title={`Frequently asked questions about mobile car wash service in ${page.localName}`}
        items={page.faqs}
        citySlug={page.slug}
        countySlug={page.countySlug}
      />
      {page.nearbyCities.length > 0 ? (
        <NearbyCitiesGrid
          title={nearbyTitle}
          cities={page.nearbyCities}
          countySlug={page.countySlug}
        />
      ) : null}
      <RelatedResources
        title="Related Lavo resources"
        links={page.relatedLinks}
        citySlug={page.slug}
        countySlug={page.countySlug}
      />
      <CityFinalCta
        residentHeadline={page.finalCta.residentHeadline}
        propertyHeadline={page.finalCta.propertyHeadline}
        citySlug={page.slug}
        countySlug={page.countySlug}
      />
    </>
  );
}
