import { JsonLd } from '@/components/seo/JsonLd';
import { articleSchema } from '@/lib/seo/schema';

type ArticleJsonLdProps = {
  path: string;
  headline: string;
  description: string;
  /** ISO date. Rendered visibly by `AnswerFirstPage` from the same value. */
  dateModified: string;
  datePublished?: string;
};

/**
 * Article schema for editorial pages (resources, guides, blog posts).
 *
 * `dateModified` is required here rather than optional: an Article with no
 * modification date is the single most common reason a page loses freshness
 * signals. When rendered through `AnswerFirstPage` the template passes its own
 * `dateModified`, so the schema date and the visible "Last updated" line are
 * the same string by construction.
 */
export function ArticleJsonLd({
  path,
  headline,
  description,
  dateModified,
  datePublished,
}: ArticleJsonLdProps) {
  return (
    <JsonLd
      data={articleSchema({ path, headline, description, dateModified, datePublished })}
    />
  );
}
