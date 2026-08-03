/**
 * Normalization for FAQ pairs.
 *
 * Lives in a plain module rather than beside the component so the validation
 * script can exercise it without JSX, and so the visible accordion and the
 * FAQPage schema provably run the same input through the same function.
 */

export type FaqItem = { question: string; answer: string };

/**
 * Trim, drop incomplete pairs, and collapse duplicate questions (first wins).
 *
 * Both outputs of `FaqBlock` render from the return value of this function.
 * A question dropped here is dropped from the schema and the page together —
 * that shared derivation is what makes drift impossible rather than unlikely.
 */
export function normalizeFaqs(items: readonly FaqItem[]): FaqItem[] {
  const seen = new Set<string>();
  const out: FaqItem[] = [];

  for (const item of items) {
    const question = (item?.question ?? '').trim();
    const answer = (item?.answer ?? '').trim();
    if (!question || !answer) continue;

    const key = question.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    out.push({ question, answer });
  }

  return out;
}

/** Stable DOM id for a question, used to anchor accordion entries. */
export function faqAnchorId(question: string): string {
  const slug = question
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `faq-${slug || 'question'}`;
}
