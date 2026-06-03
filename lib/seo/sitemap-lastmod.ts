import type { SitemapRoute } from './sitemap-routes';

/** Content last-updated dates (ISO). Update when page copy materially changes. */
const STATIC_LASTMOD: Record<string, string> = {
  '/': '2026-05-01',
  '/buildings': '2026-04-15',
  '/operators': '2026-04-15',
  '/residents': '2026-04-15',
  '/how-it-works': '2026-05-10',
  '/help': '2026-03-01',
  '/contact': '2026-01-01',
  '/about': '2026-03-01',
  '/safety': '2026-03-01',
  '/resources': '2026-05-01',
  '/cities': '2026-06-01',
  '/legal/terms': '2026-01-01',
  '/legal/privacy': '2026-01-01',
  '/legal/damage-policy': '2026-03-01',
  '/legal/water-policy': '2026-03-01',
};

const CITY_CONTENT_LASTMOD = '2026-06-01';
const COUNTY_CONTENT_LASTMOD = '2026-06-01';
const STATE_CITY_LASTMOD = '2026-05-15';
const RESOURCE_CONTENT_LASTMOD = '2026-04-01';

export function lastModifiedForSitemapRoute(route: SitemapRoute): Date {
  const { path } = route;
  if (STATIC_LASTMOD[path]) {
    return new Date(STATIC_LASTMOD[path]!);
  }
  if (path.startsWith('/resources/')) {
    return new Date(RESOURCE_CONTENT_LASTMOD);
  }
  if (path.startsWith('/cities/counties/')) {
    return new Date(COUNTY_CONTENT_LASTMOD);
  }
  if (path === '/cities/new-jersey') {
    return new Date(STATE_CITY_LASTMOD);
  }
  if (path.startsWith('/cities/')) {
    return new Date(CITY_CONTENT_LASTMOD);
  }
  return new Date(CITY_CONTENT_LASTMOD);
}
