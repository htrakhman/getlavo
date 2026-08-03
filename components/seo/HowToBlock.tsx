import { JsonLd } from '@/components/seo/JsonLd';
import { howToSchema } from '@/lib/seo/schema';

export type HowToStep = {
  name: string;
  text: string;
  /** Anchor or path this step links to, when it maps elsewhere on the site. */
  path?: string;
};

type HowToBlockProps = {
  path: string;
  name: string;
  description: string;
  /** Single source for both the numbered list and the HowTo schema. */
  steps: readonly HowToStep[];
  /** ISO 8601 duration, e.g. `PT5M`. */
  totalTime?: string;
  supply?: string[];
  tool?: string[];
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  /** Set false only when a parent composes the schema into a `@graph`. */
  emitSchema?: boolean;
  /**
   * Set false only if the steps are already rendered elsewhere on the page.
   * Google requires HowTo steps to be visible to users; schema-only HowTo is a
   * structured-data policy violation, so this defaults to rendering them.
   */
  renderSteps?: boolean;
};

/**
 * Visible numbered steps and HowTo schema, rendered from one array.
 *
 * Same single-source contract as `FaqBlock`: `steps` is consumed once and both
 * outputs derive from it, so the schema cannot describe a procedure the page
 * does not show.
 */
export function HowToBlock({
  path,
  name,
  description,
  steps,
  totalTime,
  supply,
  tool,
  headingLevel = 2,
  emitSchema = true,
  renderSteps = true,
}: HowToBlockProps) {
  const cleaned = steps
    .map((step) => ({
      name: (step?.name ?? '').trim(),
      text: (step?.text ?? '').trim(),
      path: step?.path,
    }))
    .filter((step) => step.name && step.text);

  if (cleaned.length === 0) return null;

  const Heading = `h${headingLevel}` as const;
  const stepLevel = Math.min(headingLevel + 1, 6) as 3 | 4 | 5 | 6;
  const StepHeading = `h${stepLevel}` as const;

  return (
    <section className="mb-10">
      {emitSchema ? (
        <JsonLd
          data={howToSchema({ path, name, description, steps: cleaned, totalTime, supply, tool })}
        />
      ) : null}

      {renderSteps ? (
        <>
          <Heading className="font-display text-xl font-semibold tracking-tight text-ink-100 sm:text-2xl">
            {name}
          </Heading>
          <p className="mt-3 text-sm leading-relaxed text-ink-300 sm:text-base">{description}</p>

          <ol className="mt-5 space-y-4 sm:mt-6">
            {cleaned.map((step, index) => (
              <li key={step.name} className="card flex gap-4 p-4 sm:p-5">
                <span
                  aria-hidden
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gleam-100 text-sm font-semibold text-gleam-700"
                >
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <StepHeading className="text-base font-medium leading-snug text-ink-100">
                    {step.name}
                  </StepHeading>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-300">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </>
      ) : null}
    </section>
  );
}
