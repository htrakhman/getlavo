import { trimMetaDescription } from '../utils';
import { buildContext, pick, type CityTemplateContext } from './context';
import type {
  AudienceCard,
  CityFaq,
  CityPageViewModel,
  NumberedStep,
  PropertyTypeRow,
  ServiceRow,
} from '../types';
import type { NjMunicipality } from '../nj-municipalities';
import { getNearbyCities } from '../utils';

const PROPERTY_TYPE_ROWS: PropertyTypeRow[] = [
  {
    propertyType: 'High rise apartments',
    whyItWorks: 'Residents often park in structured garages and value convenience',
    whatLavoNeeds: 'Clear garage access, stall labeling, and building approval',
  },
  {
    propertyType: 'Mid rise apartment buildings',
    whyItWorks: 'Good fit when parking is assigned or managed',
    whatLavoNeeds: 'Approved service area and resident communication',
  },
  {
    propertyType: 'Garden apartment communities',
    whyItWorks: 'Surface lots can make vehicle access easier',
    whatLavoNeeds: 'Clear building map and parking rules',
  },
  {
    propertyType: 'Mixed use buildings',
    whyItWorks: 'Residents may already use shared parking or garage systems',
    whatLavoNeeds: 'Defined service windows and vendor access process',
  },
  {
    propertyType: 'Condo communities',
    whyItWorks: 'Owners may value convenient recurring vehicle care',
    whatLavoNeeds: 'HOA or management approval',
  },
  {
    propertyType: 'Townhome communities',
    whyItWorks: 'Can work where parking is private, assigned, or community managed',
    whatLavoNeeds: 'Rules for driveways, lots, or shared parking areas',
  },
];

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

function buildMeta(ctx: CityTemplateContext) {
  const title = `Mobile Car Wash for Apartments in ${ctx.seoName}, NJ | Lavo`;
  const description = trimMetaDescription(
    `Lavo helps ${ctx.name} apartment residents in ${ctx.county} County, NJ book mobile car washes at their building garage or parking area while giving property managers a no cost resident amenity.`,
  );
  return {
    title,
    description,
    canonicalPath: `/cities/${ctx.slug}`,
  };
}

function buildOverview(ctx: CityTemplateContext): string[] {
  const { name, county, enrichment, tier, neighborhoods, corridor, commute, parking } = ctx;
  const paras: string[] = [];

  if (enrichment.overviewExtra?.length) {
    paras.push(...enrichment.overviewExtra);
  } else {
    const hood =
      neighborhoods?.length && tier === 1
        ? `especially near ${neighborhoods.slice(0, 4).join(', ')}`
        : 'across the municipality';
    paras.push(
      pick(ctx.seed + 'ov0', [
        `${name} has many apartment communities ${hood} in ${county} County. Depending on the property, residents often park in ${ctx.parkingTypes}, which can make a building based mobile car wash program easier to coordinate than a traditional drive to a car wash.`,
        `In ${name}, ${ctx.commonPropertyTypes} often rely on ${ctx.parkingTypes}. When the property approves a service zone, residents can book washes without leaving the community.`,
        `${name} sits in ${ctx.region}, where buildings along ${corridor} see steady use from ${commute}. On-site washing can fit buildings that already manage garage or lot access carefully.`,
      ]),
      pick(ctx.seed + 'ov1', [
        `For residents balancing work, commuting, and errands, Lavo gives ${name} households a way to book a wash at the building instead of leaving the property.`,
        `Many ${name} residents already treat car care as a time problem. Building based service can reduce extra trips when parking is assigned or garage-based.`,
        `Properties in ${name} can offer convenience while keeping vendor access organized through clear rules and approved service windows.`,
      ]),
    );
    if (tier >= 2) {
      paras.push(
        pick(ctx.seed + 'ov2', [
          `In ${name}, mobile service works best when properties post clear garage or lot rules and operators can stage equipment without blocking drive aisles.`,
          `Many ${name} communities mix garden stock with mid-rise buildings, so spot labeling in the booking flow helps operators on first visits.`,
          `Winter road salt and seasonal grime in ${county} County push some ${name} residents toward on-site service instead of weekend tunnel trips.`,
        ]),
      );
    }
  }

  paras.push(
    pick(ctx.seed + 'ovpm', [
      `For property managers in ${name}, the value is not just the wash itself. The value is giving residents a practical amenity that feels useful, does not require new building infrastructure, and can be managed through clear access rules, service windows, and operator instructions.`,
      `Property teams in ${name} can offer a practical amenity without wash bays or new staff while residents book and pay for their own service.`,
      `In ${name}, Lavo helps management offer structured vendor access instead of one-off detailers who arrive without clear building rules.`,
    ]),
  );

  if (tier === 1) {
    paras.push(
      pick(ctx.seed + 'ov3', [
        `${name} properties with structured parking often benefit when management defines approved wash zones, quiet hours, and garage access instructions before the first service day.`,
        `Residents in commuter-heavy ${name} buildings may rebook when the first on-site visit is smooth and matches building parking rules.`,
      ]),
      pick(ctx.seed + 'ov4', [
        `Depending on the property, buildings near ${ctx.nearbyTransit} may see stronger demand from residents who want car care without adding another stop to their commute.`,
        `In ${name}, commuter patterns and ${ctx.commute} can make building based washes more attractive than extra driving.`,
        `${name} households with assigned parking often prefer on-site service when management defines clear wash windows.`,
      ]),
    );
  }

  return paras.slice(0, tier === 1 ? 5 : tier === 2 ? 4 : 3);
}

function buildFaqs(ctx: CityTemplateContext): CityFaq[] {
  const { name, county } = ctx;
  const all: CityFaq[] = [
    {
      question: `Does Lavo offer mobile car wash service in ${name}?`,
      answer: `Lavo is building apartment based mobile car wash coverage in ${name}. Availability depends on whether your building is active, whether the property has approved service, and whether local operators are available.`,
    },
    {
      question: `Can I use Lavo if my apartment building is not listed?`,
      answer: `Yes. If your building is not live yet, you can submit a request with your building address. Lavo uses resident requests to understand demand and contact property managers.`,
    },
    {
      question: `Does my property manager need to approve Lavo?`,
      answer: `For apartment garages, managed lots, and shared residential parking areas, property approval is usually needed. This helps ensure operators follow access rules, quiet hours, service zones, and building policies.`,
    },
    {
      question: `Is Lavo free for apartment buildings?`,
      answer: `Lavo is designed as a no cost amenity for property managers. Residents book and pay for their own services, while the property can offer the convenience without hiring staff or building a wash bay.`,
    },
    {
      question: `Where does the car wash happen?`,
      answer: `Service typically happens in an approved apartment garage, parking lot, assigned space, or designated building area. The exact setup depends on the property's parking layout and rules.`,
    },
    {
      question: `Can Lavo wash cars in apartment garages?`,
      answer: `Lavo is built for apartment settings, including garages and managed parking areas, but each property needs to approve where service can happen. Some buildings may prefer exterior lots or specific service zones.`,
    },
    {
      question: `What information does a resident need to book?`,
      answer: `Residents may need to provide their building address, unit number, parking level, stall number, vehicle details, license plate, and any access instructions required by the property.`,
    },
    {
      question: `Can street parked cars use Lavo?`,
      answer: `Street parked vehicles may be harder to support because of parking rules, access, and local restrictions. Lavo works best when the property can provide an approved service area or managed parking location.`,
    },
    {
      question: `What services are available?`,
      answer: `Services may include exterior washes, interior refreshes, full washes, and detailing, depending on operator availability in ${name}. Exact packages can vary by location and building.`,
    },
    {
      question: `How do operators get access to a building?`,
      answer: `Operators follow the property's approved access instructions. This may include garage entry rules, concierge instructions, loading area rules, quiet hours, or onsite contact information.`,
    },
    {
      question: `Is Lavo available for condo buildings or HOAs?`,
      answer: `Yes, Lavo can work for condo communities and HOAs when the community has a managed parking setup and the association or property manager approves the service.`,
    },
    {
      question: `How can property managers get started?`,
      answer: `Property managers can submit their building information, parking setup, and preferred service rules. Lavo will review the property and help coordinate a launch if operator coverage is available.`,
    },
  ];
  const count = ctx.tier === 1 ? 12 : ctx.tier === 2 ? 10 : 8;
  return all.slice(0, count);
}

function residentSteps(): NumberedStep[] {
  return [
    { title: 'Search for your building', description: 'Enter your apartment building or community address to see whether Lavo is available.' },
    { title: 'Request Lavo if your building is not live yet', description: 'If your property is not active, submit a request so Lavo can see resident demand and contact the building.' },
    { title: 'Book a service', description: 'Choose an available wash or detail package, select a time window, and enter any needed parking details.' },
    { title: 'Share vehicle and parking details', description: 'Add your unit number, parking level, stall number, license plate, or building specific instructions when required.' },
    { title: 'Get service updates', description: 'Receive updates before and after the operator completes the wash.' },
    { title: 'Rebook when needed', description: 'Residents can rebook future services based on building availability and operator coverage.' },
  ];
}

function pmSteps(): NumberedStep[] {
  return [
    { title: 'Confirm the property setup', description: 'Lavo reviews the building type, parking layout, access rules, and preferred service areas.' },
    { title: 'Set building rules', description: 'The property can define quiet hours, entry instructions, approved wash zones, garage restrictions, and resident communication guidelines.' },
    { title: 'Launch to residents', description: 'Lavo provides a resident facing booking path and request flow.' },
    { title: 'Coordinate operator access', description: 'Operators follow the building instructions instead of arriving as unapproved random vendors.' },
    { title: 'Keep the amenity simple', description: 'Residents book and pay for their own services, while the property offers the convenience as an amenity.' },
  ];
}

function operatorSteps(): NumberedStep[] {
  return [
    { title: 'Apply to serve Lavo properties', description: 'Operators can apply to join the network.' },
    { title: 'Accept building based opportunities', description: 'Operators can serve apartment communities where resident demand exists.' },
    { title: 'Follow property rules', description: 'Operators must follow access, parking, safety, cleanup, quiet hour, and resident communication rules.' },
    { title: 'Build local route density', description: 'Serving multiple residents at the same property can reduce wasted travel time.' },
  ];
}

export function buildCityPage(muni: NjMunicipality): CityPageViewModel {
  const ctx = buildContext(muni);
  const { name, county, slug, countySlug, tier } = ctx;

  const meta = buildMeta(ctx);
  const overview = buildOverview(ctx);

  return {
    slug,
    localName: name,
    county,
    countySlug,
    stateAbbreviation: 'NJ',
    tier,
    meta,
    h1: `Mobile Car Wash for Apartment Buildings in ${name}`,
    hero: {
      subheadline: `Lavo helps residents in ${name} book mobile car washes and detailing directly from their apartment garage, parking lot, or managed residential community.`,
      plainEnglish: [
        'For residents, Lavo means less time driving to a car wash.',
        'For property managers, it is a no cost amenity that adds convenience without new staff or equipment.',
        'For operators, it creates organized building based routes instead of scattered one off jobs.',
      ],
      aeoSummary: `Lavo is a mobile car wash and detailing platform for apartment buildings in ${name}, New Jersey. Residents can request or book service at their building, property managers can offer Lavo as a no cost amenity, and operators can serve scheduled apartment routes. Availability depends on building approval and local operator coverage.`,
      trustLine:
        'Built for apartment garages, parking lots, resident communities, and managed properties across New Jersey.',
    },
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
      paragraphs: overview,
    },
    audience: {
      title: `Who Lavo helps in ${name}`,
      cards: [
        {
          title: 'For residents',
          bullets: [
            'Book a car wash from your phone.',
            'Use your building garage or approved parking area.',
            'Avoid driving to a separate car wash.',
            'Get updates when the service is complete.',
            'Request Lavo if your building is not active yet.',
          ],
        },
        {
          title: 'For property managers',
          bullets: [
            'Offer a resident amenity at no cost to the property.',
            'Avoid managing random outside detailers manually.',
            'Set building rules, approved areas, quiet hours, and access instructions.',
            'Improve resident experience without adding staff.',
            'Use the amenity in leasing, renewals, and resident communications.',
          ],
        },
        {
          title: 'For operators',
          bullets: [
            'Serve multiple residents in one building visit.',
            'Build denser local routes.',
            'Reduce time wasted driving between one off jobs.',
            'Work with properties that have clearer access rules.',
            'Grow recurring demand in approved communities.',
          ],
        },
      ],
    },
    howItWorks: {
      title: `How Lavo works in ${name}`,
      residents: residentSteps(),
      propertyManagers: pmSteps(),
      operators: operatorSteps(),
    },
    whyBuildings: {
      title: `Why apartment buildings in ${name} add Lavo`,
      paragraphs: [
        `For many apartment buildings in ${name}, the challenge is not whether residents want convenience. The challenge is offering useful services without creating extra work for the onsite team. Lavo is designed around that constraint. The property can offer a practical resident amenity while residents book and pay for their own service.`,
        pick(ctx.seed + 'wb1', [
          `In ${county} County, buildings with garages or assigned parking often see more value when wash service happens in an approved zone instead of through ad hoc vendors.`,
          `Properties in ${name} can support resident satisfaction without adding staff, equipment rooms, or wash bay construction.`,
        ]),
      ],
      bullets: [
        'Offer a practical amenity residents actually use',
        'Reduce confusion around outside vendors',
        'Create clear rules for when and where service happens',
        'Support resident satisfaction without adding staff',
        'Make garages and parking areas feel more valuable',
        'Differentiate against nearby apartment communities',
      ],
    },
    propertyTypes: {
      title: `Best fit property types in ${name}`,
      rows: PROPERTY_TYPE_ROWS,
    },
    parking: {
      title: `Parking and access requirements for ${name} buildings`,
      paragraphs: [
        `Lavo works best in ${name} when the building or community can define an approved service area, garage or lot access instructions, resident parking details, operator entrance instructions, quiet hours, water and runoff rules, staging areas for supplies, and who operators should contact if access fails.`,
        `Depending on the property, some buildings prefer interior garage service while others prefer exterior lots. Insurance and vendor requirements should be confirmed with management before launch.`,
      ],
      checklist: [
        'Where can operators enter?',
        'Where can operators park or stage?',
        'Which areas are approved for washing?',
        'Are there garage height restrictions?',
        'Are there quiet hours?',
        'Are there water use or drainage restrictions?',
        'Should residents move cars to a specific area?',
        'Who should operators call if access fails?',
        'Are there building specific vendor requirements?',
      ],
    },
    residentBenefits: {
      title: `Benefits for ${name} residents`,
      paragraphs: [
        `For residents in ${name}, Lavo is built around the reality that car care is usually an errand. You either drive somewhere, wait around, or squeeze it between work, commuting, groceries, and weekends. A building based mobile wash turns that errand into something residents can schedule from home.`,
        pick(ctx.seed + 'rb1', [
          `In areas with ${ctx.localVehicleCareFactors}, regular exterior care can help without adding another trip across ${county} County.`,
          `Residents who park in assigned stalls or garages in ${name} can keep the vehicle in place while service happens in an approved zone.`,
        ]),
      ],
      bullets: [
        'No drive to a car wash',
        'Book from your apartment',
        'Save time before work, weekends, or errands',
        'Avoid waiting rooms and lines',
        'Works well for assigned parking and garage spaces',
        'Can rebook when needed',
        'Useful for busy household schedules',
      ],
    },
    propertyManagerBenefits: {
      title: `Benefits for ${name} property managers`,
      paragraphs: [
        `Property managers in ${name} are not buying a car wash. They are adding a convenience layer to the resident experience. Lavo is designed to be lightweight for property teams: no equipment purchase, no staffing requirement, and no construction.`,
        `The amenity can be mentioned in resident emails, tours, welcome packets, and renewal campaigns while reducing uncoordinated outside vendors on the property.`,
      ],
      bullets: [
        'No cost to offer',
        'No equipment purchase',
        'No staffing requirement',
        'No construction',
        'Can improve amenity package',
        'Can reduce uncoordinated outside vendors',
        'Gives residents a clear way to request the amenity',
        'Works when parking is manageable',
      ],
    },
    services: {
      title: `Mobile car wash and detailing services in ${name}`,
      rows: SERVICE_ROWS,
    },
    vehicleCare: {
      title: `Car care considerations in ${name}`,
      paragraphs: [
        `In many New Jersey communities, ${ctx.localVehicleCareFactors} can affect how quickly vehicles pick up grime, especially when cars sit in apartment garages or shared lots.`,
        pick(ctx.seed + 'vc1', [
          `In ${name}, commuter traffic along ${ctx.corridor} and ${ctx.commute} can add road film between washes.`,
          `Depending on the property, garage dust, pollen, and seasonal salt exposure are common reasons residents prefer on-site service.`,
        ]),
        pick(ctx.seed + 'vc2', [
          `Shore-adjacent and river-adjacent buildings in ${county} County may also see salt air or urban dust that makes regular exterior care more practical when service happens at the building.`,
          `In ${name}, assigned parking and garage storage mean residents may not notice buildup until they leave for a long drive — on-site washing can fit into a normal week instead.`,
        ]),
        `Lavo does not guarantee specific environmental outcomes. The practical goal is helping residents maintain vehicles without turning car care into a separate errand.`,
      ],
    },
    operators: {
      title: `Operator opportunities in ${name}`,
      paragraphs: [
        `Lavo can help operators find apartment based demand in ${name} and ${county} County. Apartment buildings can create multiple bookings in one location, which may reduce dead time between jobs and support recurring routes.`,
        pick(ctx.seed + 'op1', [
          `Operators serving ${name} can pair stops with ${ctx.neighborText} when buildings share similar parking rules.`,
          `Crews familiar with ${ctx.parking} in the region often work faster when properties share spot maps up front.`,
        ]),
        `Availability depends on approved properties and resident demand. Operators must follow property rules and quality expectations.`,
      ],
      bullets: [
        'Find apartment based demand',
        'Serve multiple residents per building visit',
        'Build recurring local routes',
        'Follow property access and quality rules',
        'Grow with approved communities',
      ],
    },
    requestResident: {
      title: `How to request Lavo at your ${name} building`,
      paragraphs: [
        `If your building is not live on Lavo yet, residents can still start demand. Search for your building, submit a request if it is not active, and optionally share the request link with neighbors. Lavo reviews demand, identifies the property contact, and coordinates with management when there is interest.`,
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
        `Lavo is designed to be lightweight for property teams. The goal is not to add another operational burden. The goal is to create a clear, managed way for residents to access mobile car washing at the building.`,
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
