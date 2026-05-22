type FaqItem = { question: string; answer: string };

type VisibleFaqProps = {
  title?: string;
  items: FaqItem[];
};

export function VisibleFaq({ title = 'Common questions', items }: VisibleFaqProps) {
  return (
    <section className="mb-10">
      <h2 className="font-display text-2xl text-ink-100">{title}</h2>
      <dl className="mt-6 space-y-6">
        {items.map((item) => (
          <div key={item.question} className="card p-5">
            <dt className="font-medium text-ink-100">{item.question}</dt>
            <dd className="mt-2 text-sm leading-relaxed text-ink-300">{item.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
