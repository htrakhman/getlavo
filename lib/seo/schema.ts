import { SITE_ORIGIN } from './site';

export type BreadcrumbItem = { name: string; path: string };

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_ORIGIN}/#organization`,
    name: 'Lavo',
    url: `${SITE_ORIGIN}/`,
    description:
      'Lavo connects apartment residents, property managers, and vetted mobile car wash operators so residents can book car washes without leaving home.',
    email: 'hello@getlavo.io',
  };
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_ORIGIN}/#website`,
    name: 'Lavo',
    url: `${SITE_ORIGIN}/`,
    publisher: {
      '@id': `${SITE_ORIGIN}/#organization`,
    },
  };
}

type ServiceSchemaInput = {
  path: string;
  name: string;
  serviceType: string;
  description: string;
  audience: string;
  areaServed?: string;
  price?: number;
  priceCurrency?: string;
};

export function serviceSchema({
  path,
  name,
  serviceType,
  description,
  audience,
  areaServed = 'United States',
  price,
  priceCurrency = 'USD',
}: ServiceSchemaInput) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name,
    serviceType,
    description,
    url: `${SITE_ORIGIN}${path}`,
    areaServed,
    audience: {
      '@type': 'Audience',
      audienceType: audience,
    },
    provider: {
      '@id': `${SITE_ORIGIN}/#organization`,
    },
  };

  if (price !== undefined) {
    schema.offers = {
      '@type': 'Offer',
      price,
      priceCurrency,
    };
  }

  return schema;
}

type ArticleSchemaInput = {
  path: string;
  headline: string;
  description: string;
};

export function articleSchema({ path, headline, description }: ArticleSchemaInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline,
    description,
    url: `${SITE_ORIGIN}${path}`,
    author: {
      '@id': `${SITE_ORIGIN}/#organization`,
    },
    publisher: {
      '@id': `${SITE_ORIGIN}/#organization`,
    },
  };
}

export function breadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${SITE_ORIGIN}${item.path}`,
    })),
  };
}
