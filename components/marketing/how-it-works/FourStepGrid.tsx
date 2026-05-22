const STEPS = [
  {
    num: 1,
    title: 'Building launches Lavo',
    body: 'The property creates a free building page and shares a resident QR code or booking link.',
  },
  {
    num: 2,
    title: 'Residents book from their phone',
    body: 'Residents add their vehicle, parking spot, and choose an available wash day or open slot.',
  },
  {
    num: 3,
    title: 'Operators run wash day on-site',
    body: 'The local operator follows the property’s access rules, completes each wash, and uploads photos.',
  },
  {
    num: 4,
    title: 'Everyone gets updated',
    body: 'Residents are notified when the wash is complete, reviews are collected, and operator payouts are queued.',
  },
] as const;

export function FourStepGrid() {
  return (
    <section id="how-lavo-works" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-20">
      <h2 className="font-display text-center text-3xl font-semibold tracking-tight md:text-4xl">
        How Lavo works
      </h2>
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
