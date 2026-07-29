import { JsonLd } from '@/components/seo/JsonLd';
import { Breadcrumbs } from '@/components/marketing/Breadcrumbs';
import { CtaBlock } from '@/components/marketing/CtaBlock';
import { RelatedLinks, mergeRelatedLinks } from '@/components/marketing/RelatedLinks';
import { buildResourceRelatedContent } from '@/lib/seo/internal-links';
import { SeoPageHeader } from '@/components/marketing/SeoPageHeader';
import { SeoSection } from '@/components/marketing/SeoSection';
import { VisibleFaq } from '@/components/marketing/VisibleFaq';
import { articleSchema, breadcrumbSchema, faqPageSchema } from '@/lib/seo/schema';
import type { ResourcePage } from '@/lib/seo/resources';

export function ResourceArticle({ resource }: { resource: ResourcePage }) {
  const path = `/resources/${resource.slug}`;
  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Resources', path: '/resources' },
    { name: resource.h1, path },
  ];
  const relatedContent = buildResourceRelatedContent(resource);

  // Articles whose headline is itself a direct question ("Do You Need to Be
  // Home for a Mobile Car Wash?") lead their FAQ entity list with that
  // question, answered by the opening paragraph. FAQPage rather than QAPage:
  // QAPage describes user-submitted questions with community answers, while
  // every question and answer here is authored by Lavo.
  const headlineIsQuestion = resource.h1.trim().endsWith('?');
  const faqs = headlineIsQuestion
    ? [{ question: resource.h1.trim(), answer: resource.opening }, ...resource.faqs]
    : resource.faqs;

  return (
    <>
      <JsonLd
        data={[
          articleSchema({
            path,
            headline: resource.h1,
            description: resource.description,
          }),
          breadcrumbSchema(breadcrumbs),
          ...(faqs.length ? [faqPageSchema(path, faqs)] : []),
        ]}
      />
      <Breadcrumbs items={breadcrumbs} />
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
      {relatedContent.groups.length > 0 ? (
        <RelatedLinks groups={relatedContent.groups} title="Related content" />
      ) : null}
      <RelatedLinks links={mergeRelatedLinks(resource.extraRelatedLinks)} />
    </>
  );
}
