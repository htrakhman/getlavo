import type { MetadataRoute } from 'next';
import { SITEMAP_ROUTES } from '@/lib/seo/sitemap-routes';
import { SITE_ORIGIN } from '@/lib/seo/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return SITEMAP_ROUTES.map(({ path, changefreq, priority }) => ({
    url: `${SITE_ORIGIN}${path}`,
    lastModified,
    changeFrequency: changefreq,
    priority,
  }));
}
