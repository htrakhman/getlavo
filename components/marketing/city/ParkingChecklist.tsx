type ParkingChecklistProps = {
  title: string;
  paragraphs: string[];
  checklist: string[];
};

export function ParkingChecklist({ title, paragraphs, checklist }: ParkingChecklistProps) {
  return (
    <section className="mb-10">
      <h2 className="font-display text-2xl text-ink-100">{title}</h2>
      {paragraphs.map((p) => (
        <p key={p.slice(0, 48)} className="mt-4 text-sm leading-relaxed text-ink-300">
          {p}
        </p>
      ))}
      <div className="card mt-6 p-5">
        <p className="text-sm font-medium text-ink-100">Before launch, a property should be able to answer:</p>
        <ul className="mt-4 space-y-2 text-sm text-ink-300">
          {checklist.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-gleam" aria-hidden="true">
                ✓
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
