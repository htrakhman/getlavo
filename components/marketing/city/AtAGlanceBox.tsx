type AtAGlanceBoxProps = {
  title: string;
  fields: Record<string, string>;
  summary?: string;
};

export function AtAGlanceBox({ title, fields, summary }: AtAGlanceBoxProps) {
  return (
    <section className="mb-10" aria-labelledby="at-a-glance-heading">
      <h2 id="at-a-glance-heading" className="font-display text-2xl text-ink-100">
        {title}
      </h2>
      {summary ? (
        <p className="mt-4 text-sm leading-relaxed text-ink-300">{summary}</p>
      ) : null}
      <dl className="card mt-6 divide-y divide-white/10 p-0">
        {Object.entries(fields).map(([key, value]) => (
          <div key={key} className="grid gap-1 px-5 py-4 sm:grid-cols-[minmax(140px,34%)_1fr] sm:gap-4">
            <dt className="text-sm font-medium text-ink-200">{key}</dt>
            <dd className="text-sm leading-relaxed text-ink-400">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
