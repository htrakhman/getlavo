import type { NumberedStep } from '@/lib/seo/cities/types';

type HowItWorksFlowsProps = {
  title: string;
  residents: NumberedStep[];
  propertyManagers: NumberedStep[];
  operators: NumberedStep[];
};

function FlowList({ heading, steps }: { heading: string; steps: NumberedStep[] }) {
  return (
    <div className="card p-5">
      <h3 className="font-display text-lg text-ink-100">{heading}</h3>
      <ol className="mt-4 space-y-4">
        {steps.map((step, i) => (
          <li key={step.title} className="flex gap-3 text-sm">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gleam/15 font-mono text-xs text-gleam"
              aria-hidden="true"
            >
              {i + 1}
            </span>
            <div>
              <p className="font-medium text-ink-100">{step.title}</p>
              <p className="mt-1 leading-relaxed text-ink-400">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function HowItWorksFlows({
  title,
  residents,
  propertyManagers,
  operators,
}: HowItWorksFlowsProps) {
  return (
    <section className="mb-10">
      <h2 className="font-display text-2xl text-ink-100">{title}</h2>
      <div className="mt-6 space-y-4">
        <FlowList heading="For residents" steps={residents} />
        <FlowList heading="For property managers" steps={propertyManagers} />
        <FlowList heading="For operators" steps={operators} />
      </div>
    </section>
  );
}
