import type { MetadataRoute } from 'next';
import { lastModifiedForSitemapRoute } from '@/lib/seo/sitemap-lastmod';
import { SITEMAP_ROUTES } from '@/lib/seo/sitemap-routes';
import { SITE_ORIGIN } from '@/lib/seo/site';

export default function sitemap(): MetadataRoute.Sitemap {
  return SITEMAP_ROUTES.map((route) => ({
    url: `${SITE_ORIGIN}${route.path}`,
    lastModified: lastModifiedForSitemapRoute(route),
    changeFrequency: route.changefreq,
    priority: route.priority,
  }));
}
