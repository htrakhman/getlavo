import type { ReactNode } from 'react';

export type ContentSection = {
  heading: string;
  /** Body paragraphs rendered above any custom children. */
  body?: string[];
  /** Custom content rendered under this section's heading. */
  children?: ReactNode;
  /** Nested subsections. Their heading level is derived, never authored. */
  sections?: ContentSection[];
};

export type HeadingLevel = 2 | 3 | 4 | 5 | 6;

/**
 * Renders a section tree with a heading level computed from nesting depth.
 *
 * Heading hierarchy is enforced by the shape of the data, not by review: there
 * is no `level` field to set, so an author cannot place an `h4` under an `h2`.
 * The only way to reach `h4` is to nest a section two levels deep, which is
 * exactly what an `h4` means. Depth beyond `h6` clamps rather than emitting
 * invalid markup.
 */
export function ContentSections({
  sections,
  level = 2,
}: {
  sections: readonly ContentSection[];
  level?: HeadingLevel;
}) {
  if (sections.length === 0) return null;

  return (
    <>
      {sections.map((section) => (
        <SectionNode key={section.heading} section={section} level={level} />
      ))}
    </>
  );
}

function SectionNode({ section, level }: { section: ContentSection; level: HeadingLevel }) {
  const Heading = `h${level}` as const;
  const nextLevel = Math.min(level + 1, 6) as HeadingLevel;

  if (process.env.NODE_ENV !== 'production' && level === 6 && section.sections?.length) {
    console.warn(
      `[AnswerFirstPage] Section "${section.heading}" nests below h6; ` +
        'the extra levels are clamped. Flatten the outline instead.',
    );
  }

  return (
    <section id={headingId(section.heading)} className="mb-8 scroll-mt-24 sm:mb-10">
      <Heading className={headingClass(level)}>{section.heading}</Heading>

      {section.body?.length ? (
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-ink-300 sm:mt-4 sm:space-y-4 sm:text-base">
          {section.body.map((paragraph) => (
            <p key={paragraph.slice(0, 48)}>{paragraph}</p>
          ))}
        </div>
      ) : null}

      {section.children ? <div className="mt-4">{section.children}</div> : null}

      {section.sections?.length ? (
        <div className="mt-6 space-y-6 border-l border-ink-800 pl-4 sm:pl-5">
          <ContentSections sections={section.sections} level={nextLevel} />
        </div>
      ) : null}
    </section>
  );
}

/** Mobile-first type scale: sized for 375px, stepped up at `sm` and above. */
function headingClass(level: HeadingLevel): string {
  const base = 'font-display font-semibold tracking-tight text-ink-100';
  switch (level) {
    case 2:
      return `${base} text-xl sm:text-2xl`;
    case 3:
      return `${base} text-lg sm:text-xl`;
    case 4:
      return `${base} text-base sm:text-lg`;
    default:
      return `${base} text-base`;
  }
}

export function headingId(heading: string): string {
  return (
    heading
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'section'
  );
}
