const STEPS = [
  {
    num: 1,
    title: 'Book from your phone',
    body: 'Add your car, choose a wash time, and pay in a few taps.',
  },
  {
    num: 2,
    title: 'We come to your building',
    body: 'A vetted local wash team arrives on-site and follows your building’s process.',
  },
  {
    num: 3,
    title: 'Your car gets washed',
    body: 'Your car is washed at your building, either in its spot or in an approved wash area.',
  },
  {
    num: 4,
    title: 'You get notified',
    body: 'We let you know when the wash is complete.',
  },
] as const;

export function FourStepGrid() {
  return (
    <section id="how-lavo-works" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-20">
      <h2 className="font-display text-center text-3xl font-semibold tracking-tight md:text-4xl">
        How Lavo works
      </h2>
      <p className="mx-auto mt-4 max-w-xl text-center text-ink-300">
        Simple enough to understand in a few seconds.
      </p>
      <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {STEPS.map((step) => (
          <div key={step.num} className="card flex flex-col p-6">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gleam/30 bg-gleam/10 font-display text-lg text-gleam">
              {step.num}
            </span>
            <h3 className="mt-4 font-display text-lg text-ink-100">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-300">{step.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
