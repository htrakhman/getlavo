import { SITE_ORIGIN } from './site';

export type BreadcrumbItem = { name: string; path: string };

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_ORIGIN}/#organization`,
    name: 'Lavo',
    url: `${SITE_ORIGIN}/`,
    logo: `${SITE_ORIGIN}/lavo-mark.png`,
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

type OfferCatalogInput = {
  name: string;
  items: string[];
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
  /**
   * Category-level menu of what the service covers. Offers are intentionally
   * price-free — rates are operator-set per building and live only in the
   * booking flow.
   */
  offerCatalog?: OfferCatalogInput;
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
  offerCatalog,
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

  if (offerCatalog) {
    schema.hasOfferCatalog = {
      '@type': 'OfferCatalog',
      name: offerCatalog.name,
      itemListElement: offerCatalog.items.map((item) => ({
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: item,
        },
      })),
    };
  }

  return schema;
}

type ArticleSchemaInput = {
  path: string;
  headline: string;
  description: string;
  /**
   * ISO dates. Optional on the builder so existing callers keep compiling;
   * `AnswerFirstPage` always supplies `dateModified` from the same value it
   * renders in the visible "Last updated" line.
   */
  datePublished?: string;
  dateModified?: string;
};

export function articleSchema({
  path,
  headline,
  description,
  datePublished,
  dateModified,
}: ArticleSchemaInput) {
  const url = `${SITE_ORIGIN}${path}`;
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${url}#article`,
    headline,
    description,
    url,
    mainEntityOfPage: { '@id': `${url}#webpage` },
    author: {
      '@id': `${SITE_ORIGIN}/#organization`,
    },
    publisher: {
      '@id': `${SITE_ORIGIN}/#organization`,
    },
  };

  if (datePublished) schema.datePublished = datePublished;
  if (dateModified) schema.dateModified = dateModified;

  return schema;
}

type HowToStepInput = {
  name: string;
  text: string;
  /** Anchor or absolute URL for the step, when it maps to a section on the page. */
  path?: string;
};

type HowToSchemaInput = {
  path: string;
  name: string;
  description: string;
  steps: HowToStepInput[];
  /** ISO 8601 duration, e.g. `PT5M`. */
  totalTime?: string;
  supply?: string[];
  tool?: string[];
};

/**
 * HowTo for procedural pages ("how to add a car wash amenity", "how to book").
 *
 * Steps are positional, so the order of the array is the order engines read.
 */
export function howToSchema({
  path,
  name,
  description,
  steps,
  totalTime,
  supply,
  tool,
}: HowToSchemaInput) {
  const url = `${SITE_ORIGIN}${path}`;
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    '@id': `${url}#howto`,
    name,
    description,
    step: steps.map((step, index) => {
      const item: Record<string, unknown> = {
        '@type': 'HowToStep',
        position: index + 1,
        name: step.name,
        text: step.text,
      };
      if (step.path) {
        item.url = step.path.startsWith('http') ? step.path : `${SITE_ORIGIN}${step.path}`;
      }
      return item;
    }),
  };

  if (totalTime) schema.totalTime = totalTime;
  if (supply?.length) {
    schema.supply = supply.map((name) => ({ '@type': 'HowToSupply', name }));
  }
  if (tool?.length) {
    schema.tool = tool.map((name) => ({ '@type': 'HowToTool', name }));
  }

  return schema;
}

/**
 * @param path Canonical path of the host page. Supplying it sets the `@id`
 *   that `webPageSchema` already points `breadcrumb` at — without it that
 *   reference dangles.
 */
export function breadcrumbSchema(items: BreadcrumbItem[], path?: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    ...(path ? { '@id': `${SITE_ORIGIN}${path}#breadcrumb` } : {}),
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
  datePublished?: string;
  dateModified?: string;
  /** Answer-first copy, mirrored into `description` when none is supplied. */
  primaryAnswer?: string;
};

export function webPageSchema({
  path,
  name,
  description,
  datePublished,
  dateModified,
  primaryAnswer,
}: WebPageSchemaInput) {
  const url = `${SITE_ORIGIN}${path}`;
  const schema: Record<string, unknown> = {
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

  if (datePublished) schema.datePublished = datePublished;
  if (dateModified) schema.dateModified = dateModified;
  // Marks the answer-first paragraph as the extractable summary of the page.
  if (primaryAnswer) schema.abstract = primaryAnswer;

  return schema;
}

type FaqItem = { question: string; answer: string };

type LocalBusinessBuildingInput = {
  name: string;
  path: string;
  city: string;
  state: string;
  county?: string;
};

export function localBusinessSchema({
  name,
  path,
  city,
  state,
  county,
}: LocalBusinessBuildingInput) {
  const url = `${SITE_ORIGIN}${path}`;
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${url}#localbusiness`,
    name,
    url,
    address: {
      '@type': 'PostalAddress',
      addressLocality: city,
      addressRegion: state,
      addressCountry: 'US',
    },
  };
  if (county) {
    (schema.address as Record<string, unknown>).addressRegion = `${state}`;
    schema.areaServed = {
      '@type': 'AdministrativeArea',
      name: `${county} County`,
    };
  }
  return schema;
}

type SiteLocalBusinessInput = {
  /**
   * Cities Lavo serves. Supplied by `getServedAreas()`, which reads Supabase —
   * never a literal in page code, or the schema goes stale the moment a new
   * city launches.
   */
  areaServed: { city: string; state: string; county?: string }[] | null;
};

/**
 * The one sitewide LocalBusiness node.
 *
 * Shares the `#organization` `@id` used by `organizationSchema` so the two are
 * a single entity in the graph rather than two businesses with the same name.
 * `areaServed` is omitted entirely when the served-city query fails — see
 * `lib/seo/served-areas.ts` for why an empty claim beats a stale one.
 */
export function siteLocalBusinessSchema({ areaServed }: SiteLocalBusinessInput) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${SITE_ORIGIN}/#organization`,
    name: 'Lavo',
    url: `${SITE_ORIGIN}/`,
    logo: `${SITE_ORIGIN}/lavo-mark.png`,
    image: `${SITE_ORIGIN}/lavo-mark.png`,
    description:
      'Lavo connects apartment residents, property managers, and vetted mobile car wash operators so residents can book car washes without leaving home.',
    email: 'hello@getlavo.io',
    priceRange: '$$',
  };

  if (areaServed?.length) {
    schema.areaServed = areaServed.map((area) => {
      const place: Record<string, unknown> = {
        '@type': 'City',
        name: area.city,
        containedInPlace: {
          '@type': 'State',
          name: area.state,
        },
      };
      if (area.county) {
        (place.containedInPlace as Record<string, unknown>).containedInPlace = {
          '@type': 'AdministrativeArea',
          name: `${area.county} County`,
        };
      }
      return place;
    });
  }

  return schema;
}

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
