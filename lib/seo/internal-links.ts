import { FEATURED_CITY_SLUGS, KEEP_COUNTY_SLUGS } from '@/lib/seo/keep-cities';
import { getMunicipalityBySlug } from '@/lib/seo/cities/nj-municipalities';
import { RESOURCES, RESOURCE_SLUGS, type ResourcePage } from '@/lib/seo/resources';

export type FooterLink = { href: string; label: string };
export type FooterColumn = { title: string; links: FooterLink[] };

// The top nav stays minimal (Home / How it works / Check your building /
// Sign up / Contact) — everything else lives down here in the footer.
export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: 'Lavo for',
    links: [
      { href: '/residents', label: 'Residents' },
      { href: '/buildings', label: 'Properties' },
      { href: '/operators', label: 'Operators' },
      { href: '/cities', label: 'Check your building' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/about', label: 'About' },
      { href: '/safety', label: 'Safety' },
      { href: '/help', label: 'Help' },
      { href: '/resources', label: 'Resources' },
      { href: '/contact', label: 'Contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/legal/privacy', label: 'Privacy' },
      { href: '/legal/terms', label: 'Terms' },
      { href: '/legal/damage-policy', label: 'Damage policy' },
      { href: '/legal/water-policy', label: 'Water policy' },
    ],
  },
];

/** Sibling resource guides for related-content blocks (2–3 per page). */
const RESOURCE_SIBLING_SLUGS: Record<string, string[]> = {
  'apartment-car-wash-amenity': [
    'car-wash-amenity-for-property-managers',
    'mobile-car-wash-apartment-garage',
  ],
  'car-wash-amenity-for-property-managers': [
    'apartment-car-wash-amenity',
    'car-wash-amenity-insurance-damage',
  ],
  'mobile-car-wash-apartment-garage': [
    'mobile-car-wash-for-apartment-residents',
    'do-you-need-to-be-home-for-mobile-car-wash',
  ],
  'mobile-car-wash-for-apartment-residents': [
    'mobile-car-wash-apartment-garage',
    'do-you-need-to-be-home-for-mobile-car-wash',
  ],
  'do-you-need-to-be-home-for-mobile-car-wash': [
    'mobile-car-wash-for-apartment-residents',
    'mobile-car-wash-apartment-garage',
  ],
  'free-resident-amenity-ideas': [
    'apartment-car-wash-amenity',
    'car-wash-amenity-for-property-managers',
  ],
  'car-wash-amenity-insurance-damage': [
    'car-wash-amenity-for-property-managers',
    'apartment-car-wash-amenity',
  ],
  'mobile-detailing-leads-apartments': [
    'apartment-wash-day-playbook',
    'mobile-car-wash-apartment-garage',
  ],
  'apartment-wash-day-playbook': [
    'mobile-detailing-leads-apartments',
    'car-wash-amenity-for-property-managers',
  ],
};

/** Relevant city pages for resource articles (1–2 per guide). */
const RESOURCE_CITY_SLUGS: Record<string, string[]> = {
  'apartment-car-wash-amenity': ['jersey-city', 'hoboken'],
  'car-wash-amenity-for-property-managers': ['jersey-city', 'edgewater'],
  'mobile-car-wash-apartment-garage': ['hoboken', 'new-brunswick'],
  'mobile-car-wash-for-apartment-residents': ['jersey-city', 'edison'],
  'do-you-need-to-be-home-for-mobile-car-wash': ['hoboken', 'fort-lee'],
  'free-resident-amenity-ideas': ['woodbridge', 'piscataway'],
  'car-wash-amenity-insurance-damage': ['jersey-city'],
  'mobile-detailing-leads-apartments': ['edison', 'sayreville'],
  'apartment-wash-day-playbook': ['new-brunswick', 'north-brunswick'],
};

function resourceLink(slug: string): FooterLink | undefined {
  const resource = RESOURCES.find((r) => r.slug === slug);
  if (!resource) return undefined;
  return { href: `/resources/${resource.slug}`, label: resource.h1 };
}

function cityLink(slug: string): FooterLink | undefined {
  const muni = getMunicipalityBySlug(slug);
  if (!muni) return undefined;
  return { href: `/cities/${slug}`, label: muni.name };
}

export function getResourceRelatedGroups(slug: string): {
  resources: FooterLink[];
  cities: FooterLink[];
} {
  const siblingSlugs =
    RESOURCE_SIBLING_SLUGS[slug] ??
    RESOURCE_SLUGS.filter((s) => s !== slug).slice(0, 2);
  const citySlugs = RESOURCE_CITY_SLUGS[slug] ?? FEATURED_CITY_SLUGS.slice(0, 2);

  const resources = siblingSlugs
    .map((s) => resourceLink(s))
    .filter((l): l is FooterLink => Boolean(l))
    .slice(0, 3);

  const cities = citySlugs
    .map((s) => cityLink(s))
    .filter((l): l is FooterLink => Boolean(l))
    .slice(0, 2);

  return { resources, cities };
}

export function getCountyCrossLinks(currentCountySlug: string): FooterLink[] {
  return KEEP_COUNTY_SLUGS.filter((slug) => slug !== currentCountySlug).map((slug) => {
    const label =
      slug === 'hudson'
        ? 'Hudson County'
        : slug === 'bergen'
          ? 'Bergen County'
          : 'Middlesex County';
    return { href: `/cities/counties/${slug}`, label };
  });
}

export function getHomepageResourceLinks(): FooterLink[] {
  const slugs = [
    'mobile-car-wash-apartment-garage',
    'car-wash-amenity-for-property-managers',
    'apartment-car-wash-amenity',
  ] as const;
  return slugs.map((s) => resourceLink(s)!).filter(Boolean);
}

export type ResourceRelatedContent = {
  resource: ResourcePage;
  groups: { title: string; links: FooterLink[] }[];
};

export function buildResourceRelatedContent(resource: ResourcePage): ResourceRelatedContent {
  const { resources, cities } = getResourceRelatedGroups(resource.slug);
  const groups: { title: string; links: FooterLink[] }[] = [];
  if (resources.length) groups.push({ title: 'Related guides', links: resources });
  if (cities.length) groups.push({ title: 'Lavo cities', links: cities });
  return { resource, groups };
}
