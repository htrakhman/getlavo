import type { Metadata } from 'next';

export const SITE_ORIGIN = 'https://www.getlavo.io';

export function absoluteUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_ORIGIN}${normalized}`;
}

type PageMetadataInput = {
  path: string;
  title: string;
  description: string;
  noindex?: boolean;
};

export function createPageMetadata({
  path,
  title,
  description,
  noindex = false,
}: PageMetadataInput): Metadata {
  const url = absoluteUrl(path);

  return {
    metadataBase: new URL(SITE_ORIGIN),
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: 'Lavo',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    ...(noindex
      ? {
          robots: {
            index: false,
            follow: true,
          },
        }
      : {}),
  };
}
