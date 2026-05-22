import { notFound } from 'next/navigation';
import { ContentPageShell } from '@/components/marketing/ContentPageShell';
import { CityLanding } from '@/components/marketing/CityLanding';
import { CITY_SLUGS, getCityBySlug } from '@/lib/seo/cities';
import { createPageMetadata } from '@/lib/seo/site';

type Props = { params: { slug: string } };

export function generateStaticParams() {
  return CITY_SLUGS.map((slug) => ({ slug }));
}

export function generateMetadata({ params }: Props) {
  const city = getCityBySlug(params.slug);
  if (!city) return {};
  return createPageMetadata({
    path: `/cities/${city.slug}`,
    title: city.title,
    description: city.description,
  });
}

export default function CityPage({ params }: Props) {
  const city = getCityBySlug(params.slug);
  if (!city) notFound();

  return (
    <ContentPageShell fadeHeight="h-[320px]">
      <CityLanding city={city} />
    </ContentPageShell>
  );
}
