import Link from 'next/link';

const AUDIENCES = [
  {
    eyebrow: 'Property managers',
    title: 'Offer car washes as a building amenity',
    bullets: [
      'Free for the building — residents book and pay',
      'QR code and landing page ready in minutes',
      'No scheduling, payments, or wash-day logistics for staff',
    ],
    href: '/buildings',
    cta: 'How it works for properties',
    variant: 'primary' as const,
  },
  {
    eyebrow: 'Mobile wash operators',
    title: 'Get recurring building wash days',
    bullets: [
      'Partner with buildings that want on-site service',
      'Residents book through Lavo — you get the jobs',
      'Scheduled wash days instead of one-off leads',
    ],
    href: '/operators',
    cta: 'How it works for operators',
    variant: 'ghost' as const,
  },
] as const;

export function ForBuildingsAndTeams() {
  return (
    <section
      aria-labelledby="partners-heading"
      className="border-t border-white/10 bg-ink-900/30 py-20"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-gleam">
            Not booking for yourself?
          </p>
          <h2
            id="partners-heading"
            className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl"
          >
            Lavo for properties and wash teams
          </h2>
          <p className="mt-4 text-ink-300">
            Same on-site washes — different tools if you manage the building or run the crew.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
          {AUDIENCES.map((audience) => (
            <article
              key={audience.eyebrow}
              className="card flex flex-col p-8 text-left ring-1 ring-inset ring-white/[0.04] transition-colors hover:border-white/10"
            >
              <p className="text-xs font-medium uppercase tracking-widest text-ink-500">
                {audience.eyebrow}
              </p>
              <h3 className="mt-3 font-display text-2xl text-ink-100">{audience.title}</h3>
              <ul className="mt-5 flex-1 space-y-3 text-sm text-ink-300">
                {audience.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-3">
                    <span
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gleam/70"
                      aria-hidden
                    />
                    <span className="leading-relaxed">{bullet}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={audience.href}
                className={
                  audience.variant === 'primary'
                    ? 'btn-primary mt-8 w-full text-center sm:w-auto'
                    : 'btn-ghost mt-8 w-full text-center sm:w-auto'
                }
              >
                {audience.cta} →
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
