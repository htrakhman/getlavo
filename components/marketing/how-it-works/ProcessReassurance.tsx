const BULLETS = [
  'Building-approved process',
  'Vetted local wash teams',
  'Updates when the wash is complete',
] as const;

export function ProcessReassurance() {
  return (
    <section id="trust" className="scroll-mt-24 border-y border-white/10 bg-ink-900/40 py-20">
      <div className="mx-auto max-w-2xl px-6 text-center">
        <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
          Your building&apos;s process is followed.
        </h2>
        <p className="mt-6 text-base leading-relaxed text-ink-300">
          Depending on your building, your car may be washed in its parking spot or moved to an
          approved wash area. If keys or concierge access are needed, your building&apos;s normal
          process is followed.
        </p>
        <ul className="mt-10 space-y-3 text-left sm:mx-auto sm:inline-block sm:text-left">
          {BULLETS.map((bullet) => (
            <li key={bullet} className="flex items-center gap-3 text-sm text-ink-200">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gleam/70" aria-hidden />
              {bullet}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
