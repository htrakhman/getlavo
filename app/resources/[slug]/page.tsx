import { notFound } from 'next/navigation';
import { ContentPageShell } from '@/components/marketing/ContentPageShell';
import { ResourceArticle } from '@/components/marketing/ResourceArticle';
import { RESOURCE_SLUGS, getResourceBySlug } from '@/lib/seo/resources';
import { createPageMetadata } from '@/lib/seo/site';

type Props = { params: { slug: string } };

export function generateStaticParams() {
  return RESOURCE_SLUGS.map((slug) => ({ slug }));
}

export function generateMetadata({ params }: Props) {
  const resource = getResourceBySlug(params.slug);
  if (!resource) return {};
  return createPageMetadata({
    path: `/resources/${resource.slug}`,
    title: resource.title,
    description: resource.description,
  });
}

export default function ResourcePage({ params }: Props) {
  const resource = getResourceBySlug(params.slug);
  if (!resource) notFound();

  return (
    <ContentPageShell fadeHeight="h-[320px]">
      <ResourceArticle resource={resource} />
    </ContentPageShell>
  );
}
