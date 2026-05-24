import { SITE_ORIGIN } from './site';

export type BreadcrumbItem = { name: string; path: string };

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_ORIGIN}/#organization`,
    name: 'Lavo',
    url: `${SITE_ORIGIN}/`,
    logo: `${SITE_ORIGIN}/lavo-email-logo.svg`,
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

type AreaServedInput =
  | string
  | {
      city: string;
      state: string;
      county?: string;
    };

type ServiceSchemaInput = {
  path: string;
  name: string;
  serviceType: string;
  description: string;
  audience: string;
  areaServed?: AreaServedInput;
  price?: number;
  priceCurrency?: string;
};

function normalizeAreaServed(areaServed: AreaServedInput) {
  if (typeof areaServed === 'string') return areaServed;
  const place: Record<string, unknown> = {
    '@type': 'City',
    name: areaServed.city,
    containedInPlace: {
      '@type': 'State',
      name: areaServed.state,
    },
  };
  if (areaServed.county) {
    (place.containedInPlace as Record<string, unknown>).containedInPlace = {
      '@type': 'AdministrativeArea',
      name: `${areaServed.county} County`,
    };
  }
  return place;
}

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
    areaServed: normalizeAreaServed(areaServed),
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

type WebPageSchemaInput = {
  path: string;
  name: string;
  description: string;
};

export function webPageSchema({ path, name, description }: WebPageSchemaInput) {
  const url = `${SITE_ORIGIN}${path}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    name,
    description,
    url,
    isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
    about: { '@id': `${SITE_ORIGIN}/#organization` },
    breadcrumb: { '@id': `${url}#breadcrumb` },
  };
}

type FaqItem = { question: string; answer: string };

export function faqPageSchema(path: string, items: FaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${SITE_ORIGIN}${path}#faq`,
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

export function jsonLdGraph(nodes: Record<string, unknown>[]) {
  return {
    '@context': 'https://schema.org',
    '@graph': nodes.map((node) => {
      const { '@context': _ctx, ...rest } = node;
      return rest;
    }),
  };
}
