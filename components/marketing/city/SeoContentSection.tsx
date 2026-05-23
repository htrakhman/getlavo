type SeoContentSectionProps = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

export function SeoContentSection({ title, paragraphs, bullets }: SeoContentSectionProps) {
  return (
    <section className="mb-10">
      <h2 className="font-display text-2xl text-ink-100">{title}</h2>
      {paragraphs?.map((p) => (
        <p key={p.slice(0, 48)} className="mt-4 text-sm leading-relaxed text-ink-300">
          {p}
        </p>
      ))}
      {bullets?.length ? (
        <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-ink-300">
          {bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
