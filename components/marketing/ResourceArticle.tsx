import { JsonLd } from '@/components/seo/JsonLd';
import { CtaBlock } from '@/components/marketing/CtaBlock';
import { RelatedLinks, mergeRelatedLinks } from '@/components/marketing/RelatedLinks';
import { SeoPageHeader } from '@/components/marketing/SeoPageHeader';
import { SeoSection } from '@/components/marketing/SeoSection';
import { VisibleFaq } from '@/components/marketing/VisibleFaq';
import { articleSchema, breadcrumbSchema } from '@/lib/seo/schema';
import type { ResourcePage } from '@/lib/seo/resources';

export function ResourceArticle({ resource }: { resource: ResourcePage }) {
  const path = `/resources/${resource.slug}`;

  return (
    <>
      <JsonLd
        data={[
          articleSchema({
            path,
            headline: resource.h1,
            description: resource.description,
          }),
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Resources', path: '/resources' },
            { name: resource.h1, path },
          ]),
        ]}
      />
      <SeoPageHeader h1={resource.h1} opening={resource.opening} />
      <SeoSection title="What it is" paragraphs={resource.whatItIs} />
      <SeoSection title="How it works" paragraphs={resource.howItWorks} />
      <SeoSection title="Who it is for" paragraphs={resource.whoItIsFor} />
      <SeoSection title="Why it matters" paragraphs={resource.whyItMatters} />
      <VisibleFaq items={resource.faqs} />
      <SeoSection title="Get started" paragraphs={resource.getStarted} />
      <div className="mb-10">
        <CtaBlock label={resource.cta.label} href={resource.cta.href} />
      </div>
      <RelatedLinks links={mergeRelatedLinks(resource.extraRelatedLinks)} />
    </>
  );
}
