type RequestFlowSectionProps = {
  title: string;
  paragraphs: string[];
  steps: string[];
};

export function RequestFlowSection({ title, paragraphs, steps }: RequestFlowSectionProps) {
  return (
    <section className="mb-10">
      <h2 className="font-display text-2xl text-ink-100">{title}</h2>
      {paragraphs.map((p) => (
        <p key={p.slice(0, 48)} className="mt-4 text-sm leading-relaxed text-ink-300">
          {p}
        </p>
      ))}
      <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-ink-300">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </section>
  );
}
