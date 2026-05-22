type SeoSectionProps = {
  title: string;
  paragraphs: string[];
};

export function SeoSection({ title, paragraphs }: SeoSectionProps) {
  return (
    <section className="mb-10">
      <h2 className="font-display text-2xl text-ink-100">{title}</h2>
      <div className="mt-4 space-y-4 text-sm leading-relaxed text-ink-300">
        {paragraphs.map((p) => (
          <p key={p.slice(0, 48)}>{p}</p>
        ))}
      </div>
    </section>
  );
}
