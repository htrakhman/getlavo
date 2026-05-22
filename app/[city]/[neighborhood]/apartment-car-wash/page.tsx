import neighborhoods from '@/lib/launch-neighborhoods.json';
import Link from 'next/link';
import { ContentPageShell } from '@/components/marketing/ContentPageShell';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbSchema } from '@/lib/seo/schema';
import { createPageMetadata } from '@/lib/seo/site';

const CITY_MAP: Record<string, string> = {
  'jersey-city': '/cities/jersey-city',
  hoboken: '/cities/hoboken',
};

export function generateStaticParams() {
  return neighborhoods.map((n) => ({ city: n.city, neighborhood: n.neighborhood }));
}

export function generateMetadata({ params }: { params: { city: string; neighborhood: string } }) {
  const row = neighborhoods.find((n) => n.city === params.city && n.neighborhood === params.neighborhood);
  const title = row?.title ?? params.neighborhood;
  const path = `/${params.city}/${params.neighborhood}/apartment-car-wash`;
  return createPageMetadata({
    path,
    title: `Apartment Car Wash in ${title} | Lavo`,
    description: `Book mobile car wash service for apartment residents in ${title}. Buildings add Lavo as a no cost amenity.`,
  });
}

export default function NeighborhoodSeoPage({ params }: { params: { city: string; neighborhood: string } }) {
  const row = neighborhoods.find((n) => n.city === params.city && n.neighborhood === params.neighborhood);
  const title = row?.title ?? params.neighborhood;
  const path = `/${params.city}/${params.neighborhood}/apartment-car-wash`;
  const cityHref = CITY_MAP[params.city] ?? '/cities';

  return (
    <ContentPageShell fadeHeight="h-[320px]">
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Cities', path: '/cities' },
          { name: title, path },
        ])}
      />
      <h1 className="font-display text-4xl">Apartment car wash in {title}</h1>
      <p className="mt-4 text-lg leading-relaxed text-ink-300">
        Lavo helps apartment residents in {title} book mobile car washes from their building garage or parking area. Buildings offer the program at no cost while vetted operators serve approved wash days.
      </p>
      <Link href="/" className="btn-primary mt-8 inline-block">
        See if your building is on Lavo
      </Link>
      <p className="mt-6 text-sm text-ink-400">
        Local overview:{' '}
        <Link href={cityHref} className="text-gleam hover:underline">
          Lavo in {params.city.replace(/-/g, ' ')}
        </Link>
        . Guides:{' '}
        <Link href="/resources/mobile-car-wash-apartment-garage" className="text-gleam hover:underline">
          Mobile car wash in apartment garages
        </Link>
        .
      </p>
    </ContentPageShell>
  );
}
