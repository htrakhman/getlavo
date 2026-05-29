import { notFound } from 'next/navigation';
import { CountyPageTemplate } from '@/components/marketing/city/CountyPageTemplate';
import { ContentPageShell } from '@/components/marketing/ContentPageShell';
import { getCountyPageBySlug, getCountySlugs } from '@/lib/seo/cities/build-county-page';
import { createPageMetadata } from '@/lib/seo/site';

type Props = { params: { countySlug: string } };

export const dynamicParams = false;

export function generateStaticParams() {
  return getCountySlugs().map((countySlug) => ({ countySlug }));
}

export function generateMetadata({ params }: Props) {
  const page = getCountyPageBySlug(params.countySlug);
  if (!page) return {};
  return createPageMetadata({
    path: page.meta.canonicalPath,
    title: page.meta.title,
    description: page.meta.description,
  });
}

export default function CountyPage({ params }: Props) {
  const page = getCountyPageBySlug(params.countySlug);
  if (!page) notFound();

  return (
    <ContentPageShell fadeHeight="h-[280px]" wide>
      <CountyPageTemplate page={page} />
    </ContentPageShell>
  );
}
