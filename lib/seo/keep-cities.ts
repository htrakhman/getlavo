/**
 * Single source of truth for indexable NJ city landing pages.
 * Display names match `data/nj-municipalities.json` `name` fields; slugs are kebab-case.
 */
export const KEEP_CITY_NAMES = [
  'Jersey City',
  'Hoboken',
  'Weehawken',
  'West New York',
  'Union City',
  'North Bergen',
  'Guttenberg',
  'Bayonne',
  'Secaucus',
  'Edgewater',
  'Fort Lee',
  'Cliffside Park',
  'Fairview',
  'New Brunswick',
  'Edison',
  'Woodbridge',
  'Perth Amboy',
  'East Brunswick',
  'Piscataway',
  'Sayreville',
  'North Brunswick',
  'Metuchen',
  'Carteret',
] as const;

export type KeepCityName = (typeof KEEP_CITY_NAMES)[number];

/** Slugs aligned with `nj-municipalities.json` (verified against manifest). */
export const KEEP_CITY_SLUGS = [
  'jersey-city',
  'hoboken',
  'weehawken',
  'west-new-york',
  'union-city',
  'north-bergen',
  'guttenberg',
  'bayonne',
  'secaucus',
  'edgewater',
  'fort-lee',
  'cliffside-park',
  'fairview',
  'new-brunswick',
  'edison',
  'woodbridge',
  'perth-amboy',
  'east-brunswick',
  'piscataway',
  'sayreville',
  'north-brunswick',
  'metuchen',
  'carteret',
] as const;

export type KeepCitySlug = (typeof KEEP_CITY_SLUGS)[number];

export const KEEP_CITY_SLUG_SET = new Set<string>(KEEP_CITY_SLUGS);

/** Counties that contain kept cities (for hub clustering and county pages). */
export const KEEP_COUNTY_SLUGS = ['hudson', 'bergen', 'middlesex'] as const;

export type KeepCountySlug = (typeof KEEP_COUNTY_SLUGS)[number];

export const KEEP_COUNTY_SLUG_SET = new Set<string>(KEEP_COUNTY_SLUGS);

export const COUNTY_CLUSTER_BLURBS: Record<KeepCountySlug, string> = {
  hudson:
    'Dense Hudson River waterfront apartments, PATH and ferry commuters, and structured garages from Jersey City through Bayonne.',
  bergen:
    'Palisades and Route 3 corridor apartments in Edgewater, Fort Lee, Cliffside Park, and Fairview with mix of high-rise and mid-rise parking.',
  middlesex:
    'Turnpike and Route 18 corridor garden apartments, university-adjacent housing, and mid-rise stock from New Brunswick through Carteret.',
};

const NAME_TO_SLUG = new Map<string, KeepCitySlug>(
  KEEP_CITY_NAMES.map((name, i) => [name, KEEP_CITY_SLUGS[i]!]),
);

export function isKeptCitySlug(slug: string): slug is KeepCitySlug {
  return KEEP_CITY_SLUG_SET.has(slug);
}

export function isKeptCountySlug(slug: string): slug is KeepCountySlug {
  return KEEP_COUNTY_SLUG_SET.has(slug);
}

export function slugForKeepCityName(name: string): KeepCitySlug | undefined {
  return NAME_TO_SLUG.get(name);
}

/** Top cities linked from homepage and hub promos. */
export const FEATURED_CITY_SLUGS: KeepCitySlug[] = [
  'jersey-city',
  'hoboken',
  'edgewater',
  'new-brunswick',
  'edison',
];
