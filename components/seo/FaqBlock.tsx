import { JsonLd } from '@/components/seo/JsonLd';
import { type FaqItem, faqAnchorId, normalizeFaqs } from '@/lib/seo/faq';
import { faqPageSchema } from '@/lib/seo/schema';

type FaqBlockProps = {
  /** Canonical path of the host page — the FAQPage `@id` is derived from it. */
  path: string;
  /** The single source for both the visible accordion and the FAQPage schema. */
  items: readonly FaqItem[];
  title?: string;
  /** Heading level, supplied by the page template so hierarchy stays intact. */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  /** Omit the schema when a parent already composes it into a `@graph`. */
  emitSchema?: boolean;
};

/**
 * Visible FAQ accordion and FAQPage schema, rendered from one array.
 *
 * The problem this replaces: six pages currently call `faqPageSchema(...)` in
 * one place and render `<VisibleFaq>` in another, so editing the copy without
 * editing the schema silently ships an FAQPage that disagrees with the page.
 * Google treats that as a structured-data mismatch. Here `items` is consumed
 * once, normalized once, and both outputs read the result — there is no second
 * argument to forget to update.
 *
 * Uses native `<details>`/`<summary>`: answers stay in the DOM when collapsed,
 * so crawlers and extraction models read the full text with no client JS.
 */
export function FaqBlock({
  path,
  items,
  title = 'Common questions',
  headingLevel = 2,
  emitSchema = true,
}: FaqBlockProps) {
  const faqs = normalizeFaqs(items);
  if (faqs.length === 0) return null;

  const Heading = `h${headingLevel}` as const;

  return (
    <section className="mb-10" aria-labelledby="faq-heading">
      {emitSchema ? <JsonLd data={faqPageSchema(path, faqs)} /> : null}

      <Heading
        id="faq-heading"
        className="font-display text-xl font-semibold tracking-tight text-ink-100 sm:text-2xl"
      >
        {title}
      </Heading>

      <div className="mt-5 space-y-3 sm:mt-6">
        {faqs.map((faq) => (
          <details
            key={faq.question}
            id={faqAnchorId(faq.question)}
            className="card group p-4 sm:p-5"
          >
            <summary className="flex cursor-pointer list-none items-start justify-between gap-3 font-medium text-ink-100 [&::-webkit-details-marker]:hidden">
              <span className="text-base leading-snug">{faq.question}</span>
              <span
                aria-hidden
                className="mt-1 shrink-0 text-ink-400 transition-transform duration-200 group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-ink-300">{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
