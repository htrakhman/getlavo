import { notFound } from 'next/navigation';
import { CityPageTemplate } from '@/components/marketing/city/CityPageTemplate';
import { ContentPageShell } from '@/components/marketing/ContentPageShell';
import { CITY_SLUGS, getCityPageBySlug } from '@/lib/seo/cities';
import { createPageMetadata } from '@/lib/seo/site';

type Props = { params: { slug: string } };

export function generateStaticParams() {
  return CITY_SLUGS.map((slug) => ({ slug }));
}

export function generateMetadata({ params }: Props) {
  const page = getCityPageBySlug(params.slug);
  if (!page) return {};
  return createPageMetadata({
    path: page.meta.canonicalPath,
    title: page.meta.title,
    description: page.meta.description,
  });
}

export default function CitySlugPage({ params }: Props) {
  const page = getCityPageBySlug(params.slug);
  if (!page) notFound();

  return (
    <ContentPageShell fadeHeight="h-[320px]" wide>
      <CityPageTemplate page={page} />
    </ContentPageShell>
  );
}
