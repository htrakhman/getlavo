import { JsonLd } from '@/components/seo/JsonLd';
import type { CityPageViewModel } from '@/lib/seo/cities/types';
import {
  breadcrumbSchema,
  faqPageSchema,
  jsonLdGraph,
  organizationSchema,
  serviceSchema,
  webPageSchema,
} from '@/lib/seo/schema';
import { AtAGlanceBox } from './AtAGlanceBox';
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
      <SeoContentSection
        title={page.overview.title}
        paragraphs={page.overview.paragraphs}
      />
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
        href="/signup?role=operator"
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
