import { CITY_SLUGS } from './cities';
import { getCountySlugs } from './cities/build-county-page';
import { RESOURCE_SLUGS } from './resources';

export type SitemapRoute = {
  path: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
};

const STATIC_ROUTES: SitemapRoute[] = [
  { path: '/', changefreq: 'weekly', priority: 1 },
  { path: '/buildings', changefreq: 'monthly', priority: 0.9 },
  { path: '/operators', changefreq: 'monthly', priority: 0.9 },
  { path: '/residents', changefreq: 'monthly', priority: 0.9 },
  { path: '/how-it-works', changefreq: 'monthly', priority: 0.8 },
  { path: '/help', changefreq: 'monthly', priority: 0.6 },
  { path: '/contact', changefreq: 'yearly', priority: 0.5 },
  { path: '/about', changefreq: 'yearly', priority: 0.5 },
  { path: '/safety', changefreq: 'yearly', priority: 0.5 },
  { path: '/resources', changefreq: 'weekly', priority: 0.7 },
  { path: '/cities', changefreq: 'weekly', priority: 0.9 },
  { path: '/legal/terms', changefreq: 'yearly', priority: 0.2 },
  { path: '/legal/privacy', changefreq: 'yearly', priority: 0.2 },
  { path: '/legal/damage-policy', changefreq: 'yearly', priority: 0.3 },
  { path: '/legal/water-policy', changefreq: 'yearly', priority: 0.3 },
];

const RESOURCE_ROUTES: SitemapRoute[] = RESOURCE_SLUGS.map((slug) => ({
  path: `/resources/${slug}`,
  changefreq: 'monthly' as const,
  priority: 0.6,
}));

const CITY_ROUTES: SitemapRoute[] = CITY_SLUGS.map((slug) => ({
  path: `/cities/${slug}`,
  changefreq: slug === 'new-jersey' ? ('monthly' as const) : ('weekly' as const),
  priority: slug === 'new-jersey' ? 0.85 : 0.8,
}));

const COUNTY_ROUTES: SitemapRoute[] = getCountySlugs().map((slug) => ({
  path: `/cities/counties/${slug}`,
  changefreq: 'monthly' as const,
  priority: 0.75,
}));

export const SITEMAP_ROUTES: SitemapRoute[] = [
  ...STATIC_ROUTES,
  ...RESOURCE_ROUTES,
  ...CITY_ROUTES,
  ...COUNTY_ROUTES,
];

/** @deprecated Use SITEMAP_ROUTES */
export const SITEMAP_PATHS = SITEMAP_ROUTES.map((r) => r.path);
