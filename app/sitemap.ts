import type { MetadataRoute } from 'next';
import { SITE_ORIGIN } from '@/lib/seo/site';
import { SITEMAP_PATHS } from '@/lib/seo/sitemap-routes';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return SITEMAP_PATHS.map((path) => ({
    url: `${SITE_ORIGIN}${path}`,
    lastModified,
  }));
}
