import type { CityPageViewModel } from './types';
import { trimMetaDescription } from './utils';

export function buildStatePage(): CityPageViewModel {
  const name = 'New Jersey';
  const slug = 'new-jersey';

  return {
    slug,
    localName: name,
    county: 'New Jersey',
    countySlug: 'new-jersey',
    stateAbbreviation: 'NJ',
    tier: 1,
    meta: {
      title: 'Mobile Car Wash for Apartments in New Jersey | Lavo',
      description: trimMetaDescription(
        'Lavo helps New Jersey apartment residents book mobile car washes at their building garage or parking area while giving property managers a no cost resident amenity.',
      ),
      canonicalPath: `/cities/${slug}`,
    },
    h1: 'Mobile Car Wash for Apartment Buildings in New Jersey',
    hero: {
      subheadline:
        'Lavo helps residents across New Jersey book mobile car washes and detailing from apartment garages, parking lots, and managed residential communities.',
      plainEnglish: [
        'For residents, Lavo means less time driving to a car wash.',
        'For property managers, it is a no cost amenity that adds convenience without new staff or equipment.',
        'For operators, it creates organized building based routes instead of scattered one off jobs.',
      ],
      aeoSummary:
        'Lavo is a mobile car wash and detailing platform for apartment buildings in New Jersey. Residents can request or book service at their building, property managers can offer Lavo as a no cost amenity, and operators can serve scheduled apartment routes. Availability depends on building approval and local operator coverage.',
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
      title: 'Mobile car wash for apartments in New Jersey',
      paragraphs: [
        'New Jersey apartment stock mixes Hudson River high rises, garden communities in Bergen and Middlesex counties, and shore-adjacent properties with seasonal parking patterns. Many residents keep cars in attached garages, podium decks, or surface lots tied to their lease.',
        'Mobile service works when buildings set clear wash windows and operators know how to move through multi-level garages without blocking traffic lanes.',
        'North Jersey communities in particular see heavy commuter car use, which makes on-site washing attractive when tunnel trips compete for limited time.',
        'For property managers statewide, Lavo is a way to offer a practical resident amenity without capital expense, onsite wash staff, or new equipment rooms.',
      ],
    },
    audience: {
      title: 'Who Lavo helps in New Jersey',
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
      title: 'How Lavo works in New Jersey',
      residents: [
        { title: 'Search for your building', description: 'Enter your apartment building or community address to see whether Lavo is available.' },
        { title: 'Request Lavo if your building is not live yet', description: 'Submit a request so Lavo can see resident demand and contact the building.' },
        { title: 'Book a service', description: 'Choose a wash or detail package and enter parking details.' },
        { title: 'Share vehicle and parking details', description: 'Add unit, stall, plate, and access instructions when required.' },
        { title: 'Get service updates', description: 'Receive updates before and after service.' },
        { title: 'Rebook when needed', description: 'Rebook based on building availability and operator coverage.' },
      ],
      propertyManagers: [
        { title: 'Confirm the property setup', description: 'Lavo reviews building type, parking layout, and access rules.' },
        { title: 'Set building rules', description: 'Define quiet hours, wash zones, and resident communication.' },
        { title: 'Launch to residents', description: 'Residents get a booking path and request flow.' },
        { title: 'Coordinate operator access', description: 'Approved operators follow building instructions.' },
        { title: 'Keep the amenity simple', description: 'Residents book and pay; the property offers convenience.' },
      ],
      operators: [
        { title: 'Apply to serve Lavo properties', description: 'Operators can apply to join the network.' },
        { title: 'Accept building based opportunities', description: 'Serve communities where demand exists.' },
        { title: 'Follow property rules', description: 'Follow access, safety, and communication rules.' },
        { title: 'Build local route density', description: 'Serve multiple residents per property visit.' },
      ],
    },
    whyBuildings: {
      title: 'Why apartment buildings in New Jersey add Lavo',
      paragraphs: [
        'For many apartment buildings, the challenge is offering useful services without creating extra work for the onsite team. Lavo lets properties offer a practical amenity while residents book and pay for their own service.',
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
      title: 'Best fit property types in New Jersey',
      rows: [
        { propertyType: 'High rise apartments', whyItWorks: 'Structured garages and convenience-focused residents', whatLavoNeeds: 'Garage access, stall labeling, building approval' },
        { propertyType: 'Garden apartment communities', whyItWorks: 'Surface lots can simplify operator access', whatLavoNeeds: 'Lot map and parking rules' },
        { propertyType: 'Mid rise buildings', whyItWorks: 'Assigned or managed parking', whatLavoNeeds: 'Approved service area' },
        { propertyType: 'Condo communities', whyItWorks: 'Owners value recurring vehicle care', whatLavoNeeds: 'HOA or management approval' },
      ],
    },
    parking: {
      title: 'Parking and access requirements for New Jersey buildings',
      paragraphs: [
        'Lavo works best when properties define approved service areas, access instructions, quiet hours, runoff rules, and onsite contacts before launch.',
      ],
      checklist: [
        'Where can operators enter?',
        'Where can operators park or stage?',
        'Which areas are approved for washing?',
        'Are there quiet hours?',
        'Are there water use or drainage restrictions?',
        'Who should operators call if access fails?',
      ],
    },
    residentBenefits: {
      title: 'Benefits for New Jersey residents',
      paragraphs: [
        'Lavo turns car care from a drive-and-wait errand into something residents can schedule from home at an approved building parking area.',
      ],
      bullets: ['No drive to a car wash', 'Book from your apartment', 'Works with garages and assigned spots', 'Can rebook when needed'],
    },
    propertyManagerBenefits: {
      title: 'Benefits for New Jersey property managers',
      paragraphs: [
        'Property managers are not buying a car wash. They are adding a convenience layer to the resident experience without staff, equipment, or construction.',
      ],
      bullets: ['No cost to offer', 'No equipment purchase', 'No staffing requirement', 'Can improve amenity package'],
    },
    services: {
      title: 'Mobile car wash and detailing services in New Jersey',
      rows: [
        { service: 'Exterior wash', bestFor: 'Routine maintenance', usuallyIncludes: 'Exterior hand wash, wheels, windows', notes: 'Good for regular upkeep' },
        { service: 'Full wash', bestFor: 'Inside and outside', usuallyIncludes: 'Exterior wash plus interior refresh', notes: 'Common resident option' },
        { service: 'Detailing', bestFor: 'Deeper clean', usuallyIncludes: 'Varies by operator', notes: 'Availability may vary' },
      ],
    },
    vehicleCare: {
      title: 'Car care considerations in New Jersey',
      paragraphs: [
        'Winter road salt, shore-area salt air, pollen, and commuter road grime are common reasons residents prefer building-based service when parking is already solved at home.',
      ],
    },
    operators: {
      title: 'Operator opportunities in New Jersey',
      paragraphs: [
        'Operators can build routes that string together multiple apartment communities in one county or corridor, reducing windshield time between retail one-off jobs.',
      ],
      bullets: ['Apartment based demand', 'Multiple bookings per stop', 'Recurring routes', 'Property rules upfront'],
    },
    requestResident: {
      title: 'How to request Lavo at your New Jersey building',
      paragraphs: ['Search your building, submit a request if it is not live, and share with neighbors to build demand.'],
      steps: ['Search building', 'Submit request', 'Share with neighbors', 'Lavo reviews demand', 'Property contacted', 'Launch if approved'],
    },
    launchProperty: {
      title: 'How property managers in New Jersey can launch Lavo',
      paragraphs: ['Submit property interest with parking setup and access rules. Lavo coordinates operator availability when coverage exists.'],
      steps: ['Submit interest', 'Share parking setup', 'Review access rules', 'Approve resident communication', 'Launch when active'],
    },
    faqs: [
      { question: 'Does Lavo operate across New Jersey?', answer: 'Lavo is building apartment based coverage statewide. Availability depends on building approval and local operators.' },
      { question: 'Is Lavo free for buildings?', answer: 'Yes. Lavo is designed as a no cost amenity. Residents pay for services they book.' },
      { question: 'Can residents request a building?', answer: 'Yes. Residents can submit a building address to flag demand for property managers.' },
      { question: 'What parking types work?', answer: 'Garages, assigned spaces, and approved lots work when management defines service zones.' },
      { question: 'How do operators join?', answer: 'Operators can apply to serve approved properties and follow building access rules.' },
      { question: 'Are condos supported?', answer: 'Yes, when HOAs or managers approve service in managed parking areas.' },
      { question: 'Where does service happen?', answer: 'In approved garage, lot, or designated building areas per property rules.' },
      { question: 'Can street parking work?', answer: 'Lavo works best with property-approved areas; street parking is often harder to support.' },
    ],
    nearbyCities: [],
    relatedLinks: [
      { href: '/cities', label: 'All Lavo cities' },
      { href: '/resources/mobile-car-wash-apartment-garage', label: 'Mobile car wash in apartment garages' },
      { href: '/buildings', label: 'For properties' },
      { href: '/operators', label: 'For operators' },
      { href: '/residents', label: 'For residents' },
      { href: '/help', label: 'Help center' },
    ],
    finalCta: {
      residentHeadline: 'Live in a New Jersey apartment building? Request Lavo at your property.',
      propertyHeadline: 'Manage a New Jersey property? Offer a practical car care amenity without adding staff or equipment.',
    },
  };
}
