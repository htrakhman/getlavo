import { notFound } from 'next/navigation';
import { CityPageTemplate } from '@/components/marketing/city/CityPageTemplate';
import { ContentPageShell } from '@/components/marketing/ContentPageShell';
import { applyLiveDataToCityPage, logSparseCityContent } from '@/lib/seo/cities/apply-live-data';
import { buildCityPage } from '@/lib/seo/cities/build-city-page';
import { fetchCityLiveData } from '@/lib/seo/cities/city-live-data';
import {
  CITY_SLUGS,
  getCityPageBySlug,
  getMunicipalityBySlug,
  isIndexableCitySlug,
} from '@/lib/seo/cities';
import { createPageMetadata } from '@/lib/seo/site';

type Props = { params: { slug: string } };

export const dynamicParams = false;

export function generateStaticParams() {
  return CITY_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props) {
  const page = await resolveCityPage(params.slug);
  if (!page) return {};
  return createPageMetadata({
    path: page.meta.canonicalPath,
    title: page.meta.title,
    description: page.meta.description,
  });
}

async function resolveCityPage(slug: string) {
  if (slug === 'new-jersey') return getCityPageBySlug(slug);
  if (!isIndexableCitySlug(slug)) return undefined;
  const muni = getMunicipalityBySlug(slug);
  if (!muni) return undefined;
  const base = buildCityPage(muni);
  const live = await fetchCityLiveData(muni);
  const page = applyLiveDataToCityPage(base, muni, live);
  logSparseCityContent(muni, page);
  return page;
}

export default async function CitySlugPage({ params }: Props) {
  const page = await resolveCityPage(params.slug);
  if (!page) notFound();

  return (
    <ContentPageShell fadeHeight="h-[320px]" wide>
      <CityPageTemplate page={page} />
    </ContentPageShell>
  );
}
