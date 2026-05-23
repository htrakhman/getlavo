import { RESOURCE_SLUGS } from './resources';
import { CITY_SLUGS } from './cities';
import { getCountySlugs } from './cities/build-county-page';

const STATIC_ROUTES = [
  '/',
  '/buildings',
  '/operators',
  '/how-it-works',
  '/help',
  '/contact',
  '/press',
  '/about',
  '/safety',
  '/resources',
  '/cities',
  '/careers',
  '/legal/terms',
  '/legal/privacy',
  '/legal/damage-policy',
  '/legal/water-policy',
];

const RESOURCE_ROUTES = RESOURCE_SLUGS.map((slug) => `/resources/${slug}`);
const CITY_ROUTES = CITY_SLUGS.map((slug) => `/cities/${slug}`);
const COUNTY_ROUTES = getCountySlugs().map((slug) => `/cities/counties/${slug}`);

const NEIGHBORHOOD_ROUTES = [
  '/jersey-city/downtown/apartment-car-wash',
  '/hoboken/waterfront/apartment-car-wash',
];

export const SITEMAP_PATHS = [
  ...STATIC_ROUTES,
  ...RESOURCE_ROUTES,
  ...CITY_ROUTES,
  ...COUNTY_ROUTES,
  ...NEIGHBORHOOD_ROUTES,
];
