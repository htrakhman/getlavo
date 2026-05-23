import { trimMetaDescription } from '../utils';
import { buildContext } from './context';
import { buildResidentBenefits, buildPropertyManagerBenefits } from './sections/benefits';
import { buildAudience } from './sections/audience';
import { buildFaqs } from './sections/faqs';
import { buildHero } from './sections/hero';
import { buildHowItWorks } from './sections/how-it-works';
import { buildOperators } from './sections/operators';
import { buildOverview } from './sections/overview';
import { buildParking } from './sections/parking';
import { buildPropertyTypes } from './sections/property-types';
import { buildVehicleCare } from './sections/vehicle-care';
import { buildWhyBuildings } from './sections/why-buildings';
import type { CityPageViewModel, ServiceRow } from '../types';
import type { NjMunicipality } from '../nj-municipalities';
import { getNearbyCities } from '../utils';

const SERVICE_ROWS: ServiceRow[] = [
  {
    service: 'Exterior wash',
    bestFor: 'Routine maintenance',
    usuallyIncludes: 'Exterior hand wash, wheels, windows, basic dry',
    notes: 'Good for regular upkeep',
  },
  {
    service: 'Interior refresh',
    bestFor: 'Daily driver cleanup',
    usuallyIncludes: 'Vacuum, wipe down, interior surfaces, windows',
    notes: 'Helpful for commuters and families',
  },
  {
    service: 'Full wash',
    bestFor: 'Inside and outside service',
    usuallyIncludes: 'Exterior wash plus interior refresh',
    notes: 'Common resident option',
  },
  {
    service: 'Detailing',
    bestFor: 'Deeper clean',
    usuallyIncludes: 'More detailed interior or exterior work depending on operator',
    notes: 'Availability may vary by operator',
  },
  {
    service: 'Fleet or multi resident wash day',
    bestFor: 'Multiple vehicles at one building',
    usuallyIncludes: 'Scheduled service window for residents',
    notes: 'Best when property demand is high',
  },
];

function buildMeta(ctx: ReturnType<typeof buildContext>) {
  return {
    title: `Mobile Car Wash for Apartments in ${ctx.seoName}, NJ | Lavo`,
    description: trimMetaDescription(
      `Lavo helps ${ctx.name} apartment residents in ${ctx.county} County, NJ book mobile car washes at their building garage or parking area while giving property managers a no cost resident amenity.`,
    ),
    canonicalPath: `/cities/${ctx.slug}`,
  };
}

export function buildCityPage(muni: NjMunicipality): CityPageViewModel {
  const ctx = buildContext(muni);
  const { name, county, slug, countySlug, tier } = ctx;

  return {
    slug,
    localName: name,
    county,
    countySlug,
    stateAbbreviation: 'NJ',
    tier,
    meta: buildMeta(ctx),
    h1: `Mobile Car Wash for Apartment Buildings in ${name}`,
    hero: buildHero(ctx),
    atAGlance: {
      'Service type': 'Mobile car wash and detailing for apartment buildings',
      'Best for': 'Residents, property managers, leasing teams, and mobile wash operators',
      'Service locations': 'Apartment garages, parking lots, and approved building areas',
      'Building cost': 'No cost for properties to offer the amenity',
      'Resident payment': 'Residents book and pay for their own service',
      'Operator model': 'Approved operators serve scheduled building routes',
      Availability: 'Based on property approval and local operator coverage',
    },
    overview: {
      title: `Mobile car wash for apartments in ${name}, New Jersey`,
      paragraphs: buildOverview(ctx),
    },
    audience: buildAudience(ctx),
    howItWorks: buildHowItWorks(ctx),
    whyBuildings: buildWhyBuildings(ctx),
    propertyTypes: buildPropertyTypes(ctx),
    parking: buildParking(ctx),
    residentBenefits: buildResidentBenefits(ctx),
    propertyManagerBenefits: buildPropertyManagerBenefits(ctx),
    services: {
      title: `Mobile car wash and detailing services in ${name}`,
      rows: SERVICE_ROWS,
    },
    vehicleCare: buildVehicleCare(ctx),
    operators: buildOperators(ctx),
    requestResident: {
      title: `How to request Lavo at your ${name} building`,
      paragraphs: [
        `If your building is not live on Lavo yet, residents in ${name} can still start demand. Search for your building, submit a request if it is not active, and optionally share the request link with neighbors. Lavo reviews demand, identifies the property contact, and coordinates with management when there is interest.`,
      ],
      steps: [
        'Resident searches building',
        'If not live, resident requests Lavo',
        'Resident can share the request with neighbors',
        'Lavo reviews demand',
        'Lavo contacts the property manager',
        'Property reviews the amenity',
        'If approved, Lavo helps launch the building',
        'Residents get updates',
      ],
    },
    launchProperty: {
      title: `How property managers in ${name} can launch Lavo`,
      paragraphs: [
        `Lavo is designed to be lightweight for property teams in ${name}. The goal is not to add another operational burden. The goal is to create a clear, managed way for residents to access mobile car washing at the building.`,
      ],
      steps: [
        'Submit property interest',
        'Share building address and parking setup',
        'Review service area and access rules',
        'Approve resident launch communication',
        'Lavo coordinates operator availability',
        'Residents begin booking once active',
      ],
    },
    faqs: buildFaqs(ctx),
    nearbyCities: getNearbyCities(muni),
    relatedLinks: [
      { href: `/cities/counties/${countySlug}`, label: `Lavo in ${county} County` },
      { href: '/cities/new-jersey', label: 'Lavo in New Jersey' },
      { href: '/resources/mobile-car-wash-apartment-garage', label: 'Mobile car wash in apartment garages' },
      { href: '/resources/apartment-car-wash-amenity', label: 'Apartment car wash amenity' },
      { href: '/how-it-works', label: 'How Lavo works' },
      { href: '/buildings', label: 'For properties' },
      { href: '/operators', label: 'For operators' },
      { href: '/help', label: 'Help center' },
      { href: '/safety', label: 'Safety' },
      { href: '/legal/damage-policy', label: 'Damage policy' },
    ],
    finalCta: {
      residentHeadline: `Live in a ${name} apartment building? Request Lavo and help bring mobile car wash service to your property.`,
      propertyHeadline: `Manage a ${name} property? Offer residents a practical car care amenity without adding staff, equipment, or construction.`,
    },
  };
}
