import type { ReactNode } from 'react';
import { Breadcrumbs } from '@/components/marketing/Breadcrumbs';
import { type ContentSection, ContentSections } from '@/components/marketing/ContentSections';
import { FaqBlock } from '@/components/seo/FaqBlock';
import { JsonLd } from '@/components/seo/JsonLd';
import { formatDisplayDate, toIsoDate } from '@/lib/seo/dates';
import { type FaqItem, normalizeFaqs } from '@/lib/seo/faq';
import {
  type BreadcrumbItem,
  articleSchema,
  breadcrumbSchema,
  faqPageSchema,
  jsonLdGraph,
  webPageSchema,
} from '@/lib/seo/schema';

/** Below this, an "answer" is a fragment rather than an extractable answer. */
const ANSWER_FIRST_MIN_CHARS = 40;

export type AnswerFirstPageProps = {
  /** Canonical path, e.g. `/resources/apartment-car-wash-amenity`. */
  path: string;

  /** The page's only `h1`. */
  h1: string;

  /**
   * The answer-first block: a direct, self-contained answer to the question
   * the `h1` poses, rendered immediately below it.
   *
   * Required, and deliberately not nullable. This is the block extraction
   * models quote, so a page that ships without one is a page that cannot be
   * cited. An empty value throws at render — on statically generated routes
   * that fails the build rather than reaching users.
   *
   * Write it to stand alone: no "as mentioned above", no pronouns pointing at
   * the heading, 40–320 characters per paragraph.
   */
  answerFirst: string | string[];

  /**
   * ISO date. Single source for the visible "Last updated" line, the
   * `<time datetime>` attribute, `WebPage.dateModified`, and, when `article`
   * is set, `Article.dateModified`.
   */
  dateModified: string;

  datePublished?: string;

  /** Meta description for schema. Defaults to the first answer-first paragraph. */
  description?: string;

  breadcrumbs?: BreadcrumbItem[];

  /** Body content. Heading levels derive from nesting — see `ContentSections`. */
  sections?: readonly ContentSection[];

  /** Rendered by `FaqBlock`: one array drives both the accordion and the schema. */
  faqs?: readonly FaqItem[];
  faqTitle?: string;

  /**
   * Emit Article schema for editorial pages. Dates come from this component,
   * so they cannot disagree with the visible date.
   */
  article?: boolean | { headline?: string };

  /** Extra schema nodes composed into the same `@graph`. */
  extraJsonLd?: Record<string, unknown>[];

  /** Non-heading trailing content — CTAs, related links. */
  footer?: ReactNode;
};

/**
 * Page template for indexable, answer-first content.
 *
 * Guarantees, in order of how much they matter for AEO:
 *
 * 1. Exactly one `h1`, followed immediately by the answer-first block. The
 *    template owns both, so the order cannot be rearranged per page.
 * 2. `answerFirst` is a required, validated prop rather than an optional
 *    section — there is no way to render this template without one.
 * 3. A visible "Last updated" date driven by the same string as
 *    `dateModified` in schema.
 * 4. Heading levels derived from section nesting, so no level can be skipped.
 * 5. Mobile-first layout authored at 375px and stepped up from there.
 *
 * The template does not accept arbitrary top-level children. Custom content
 * attaches to a section (`ContentSection.children`) so it always sits under a
 * correctly-leveled heading, or to `footer` for non-heading blocks.
 */
export function AnswerFirstPage({
  path,
  h1,
  answerFirst,
  dateModified,
  datePublished,
  description,
  breadcrumbs,
  sections = [],
  faqs = [],
  faqTitle,
  article,
  extraJsonLd = [],
  footer,
}: AnswerFirstPageProps) {
  const answerParagraphs = normalizeAnswerFirst(answerFirst, path);
  const isoModified = toIsoDate(dateModified);
  const isoPublished = datePublished ? toIsoDate(datePublished) : undefined;
  const primaryAnswer = answerParagraphs[0]!;
  const metaDescription = description ?? primaryAnswer;

  const nodes: Record<string, unknown>[] = [
    webPageSchema({
      path,
      name: h1,
      description: metaDescription,
      datePublished: isoPublished,
      dateModified: isoModified,
      primaryAnswer,
    }),
  ];

  if (breadcrumbs?.length) {
    nodes.push(breadcrumbSchema(breadcrumbs, path));
  }

  if (article) {
    nodes.push(
      articleSchema({
        path,
        headline: typeof article === 'object' && article.headline ? article.headline : h1,
        description: metaDescription,
        datePublished: isoPublished,
        dateModified: isoModified,
      }),
    );
  }

  // FaqBlock renders with `emitSchema={false}` below so the FAQPage joins this
  // `@graph` instead of emitting a second, disconnected <script> tag. Both
  // still derive from the same `faqs` array through `normalizeFaqs`.
  const normalizedFaqs = normalizeFaqs(faqs);
  if (normalizedFaqs.length) {
    nodes.push(faqPageSchema(path, normalizedFaqs));
  }

  nodes.push(...extraJsonLd);

  return (
    <article className="pb-4">
      <JsonLd data={jsonLdGraph(nodes)} />

      {breadcrumbs?.length ? <Breadcrumbs items={breadcrumbs} /> : null}

      <header className="mb-8 sm:mb-10">
        <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight text-ink-100 sm:text-4xl md:text-5xl">
          {h1}
        </h1>

        {/*
          Answer-first block. Sits directly below the h1 with nothing between —
          no hero image, no CTA, no breadcrumb repeat. `data-answer-first` marks
          it for extraction tooling and for the validation script.
        */}
        <div
          id="answer"
          data-answer-first=""
          className="mt-5 border-l-2 border-gleam pl-4 sm:mt-6 sm:pl-5"
        >
          {answerParagraphs.map((paragraph) => (
            <p
              key={paragraph.slice(0, 48)}
              className="text-base leading-relaxed text-ink-200 first:mt-0 [&+p]:mt-3 sm:text-lg"
            >
              {paragraph}
            </p>
          ))}
        </div>

        <LastUpdated iso={isoModified} />
      </header>

      {sections.length ? <ContentSections sections={sections} level={2} /> : null}

      {faqs.length ? (
        <FaqBlock path={path} items={faqs} title={faqTitle} headingLevel={2} emitSchema={false} />
      ) : null}

      {footer ? <div className="mt-10">{footer}</div> : null}
    </article>
  );
}

function LastUpdated({ iso }: { iso: string }) {
  return (
    <p className="mt-5 text-xs text-ink-400 sm:mt-6 sm:text-sm">
      Last updated{' '}
      <time dateTime={iso} className="text-ink-300">
        {formatDisplayDate(iso)}
      </time>
    </p>
  );
}

/**
 * Validate and normalize the answer-first block.
 *
 * Throws on missing or empty content — the whole point of the required prop is
 * that it cannot be skipped, and TypeScript alone still permits `""`. Short
 * copy warns in development rather than throwing, so a genuinely terse answer
 * is possible but never accidental.
 */
function normalizeAnswerFirst(value: string | string[], path: string): string[] {
  const paragraphs = (Array.isArray(value) ? value : [value])
    .map((paragraph) => (paragraph ?? '').trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    throw new Error(
      `AnswerFirstPage (${path}): "answerFirst" is empty. Every indexable page ` +
        'needs a direct answer directly beneath the h1 — it is what AI engines ' +
        'extract for citations.',
    );
  }

  if (process.env.NODE_ENV !== 'production') {
    const total = paragraphs.join(' ').length;
    if (total < ANSWER_FIRST_MIN_CHARS) {
      console.warn(
        `[AnswerFirstPage] ${path}: answer-first block is ${total} characters. ` +
          'Aim for a self-contained answer of at least a sentence or two.',
      );
    }
  }

  return paragraphs;
}
