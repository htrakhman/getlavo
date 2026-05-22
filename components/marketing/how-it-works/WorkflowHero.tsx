import Link from 'next/link';

const WORKFLOW_COLUMNS = [
  {
    step: '01',
    title: 'Building Setup',
    pills: ['QR link created', 'Operator connected', 'Wash day scheduled'],
    doneCount: 3,
  },
  {
    step: '02',
    title: 'Resident Booking',
    pills: ['Vehicle added', 'Parking spot added', 'Payment complete'],
    doneCount: 3,
  },
  {
    step: '03',
    title: 'Operator Job Board',
    pills: ['Bookings assigned', 'Access instructions shown', 'Photos required'],
    doneCount: 2,
  },
  {
    step: '04',
    title: 'Completed Wash',
    pills: ['Resident notified', 'Review collected', 'Payout queued'],
    doneCount: 3,
  },
] as const;

const PANEL_CLASS =
  'rounded-2xl border border-white/15 bg-ink-900/85 shadow-card backdrop-blur-xl ring-1 ring-inset ring-white/[0.06]';

function WorkflowColumn({
  step,
  title,
  pills,
  doneCount,
  showArrow,
}: {
  step: string;
  title: string;
  pills: readonly string[];
  doneCount: number;
  showArrow?: boolean;
}) {
  return (
    <div className="relative flex shrink-0 snap-center flex-col">
      {showArrow && (
        <div
          className="pointer-events-none absolute -right-3 top-10 z-10 hidden h-px w-6 lg:block"
          aria-hidden
        >
          <svg width="24" height="8" viewBox="0 0 24 8" fill="none" className="text-gleam/50">
            <path
              d="M0 4h18M18 4l-4-3.5M18 4l-4 3.5"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
      <div className={`${PANEL_CLASS} flex h-full min-w-[220px] flex-col p-5 sm:min-w-[240px] lg:min-w-0`}>
        <div className="mb-4 flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] tracking-widest text-ink-500">{step}</span>
          <span className="h-1.5 w-1.5 rounded-full bg-gleam/60" aria-hidden />
        </div>
        <h3 className="font-display text-sm font-medium text-ink-100">{title}</h3>
        <ul className="mt-4 flex flex-col gap-2">
          {pills.map((pill, i) => {
            const done = i < doneCount;
            return (
              <li
                key={pill}
                className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${
                  done
                    ? 'border-gleam/30 bg-gleam/5 text-gleam'
                    : 'border-white/10 bg-white/5 text-ink-300'
                }`}
              >
                {done && (
                  <span className="text-[10px]" aria-hidden>
                    ✓
                  </span>
                )}
                {pill}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export function WorkflowHero() {
  return (
    <section className="relative px-6 pb-16 pt-16">
      <div className="mx-auto max-w-6xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-gleam/30 bg-gleam/5 px-4 py-1.5 text-xs font-medium text-gleam mb-8">
          How Lavo coordinates wash day
        </div>
        <h1 className="font-display text-4xl font-semibold leading-[1.08] tracking-tight md:text-5xl lg:text-[3.25rem]">
          Apartment car wash, coordinated from one simple workflow
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-ink-300">
          Lavo lets properties offer mobile car wash days without managing bookings, payments,
          operators, and resident coordination.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/signup?role=building_manager" className="btn-primary px-8 py-3 text-base">
            Add your building
          </Link>
          <Link href="#how-lavo-works" className="btn-ghost px-8 py-3 text-base">
            See how wash day works
          </Link>
        </div>
      </div>

      <div className="mx-auto mt-14 max-w-6xl">
        <div
          className={`${PANEL_CLASS} overflow-hidden p-4 sm:p-6`}
          aria-label="Lavo wash day workflow"
        >
          <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
            <span className="text-xs uppercase tracking-[0.18em] text-gleam">Wash day workflow</span>
            <span className="font-mono text-[10px] text-ink-500">live</span>
          </div>

          {/* Mobile / tablet: horizontal scroll */}
          <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden">
            {WORKFLOW_COLUMNS.map((col, i) => (
              <WorkflowColumn
                key={col.title}
                step={col.step}
                title={col.title}
                pills={col.pills}
                doneCount={col.doneCount}
                showArrow={i < WORKFLOW_COLUMNS.length - 1}
              />
            ))}
          </div>

          {/* Desktop: 4-column grid with connectors */}
          <div className="hidden lg:grid lg:grid-cols-4 lg:gap-4">
            {WORKFLOW_COLUMNS.map((col, i) => (
              <WorkflowColumn
                key={col.title}
                step={col.step}
                title={col.title}
                pills={col.pills}
                doneCount={col.doneCount}
                showArrow={i < WORKFLOW_COLUMNS.length - 1}
              />
            ))}
          </div>

          {/* Subtle connector line under columns on desktop */}
          <svg
            className="mt-4 hidden w-full lg:block"
            height="2"
            preserveAspectRatio="none"
            aria-hidden
          >
            <defs>
              <linearGradient id="workflow-line" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#19F0D8" stopOpacity="0.2" />
                <stop offset="50%" stopColor="#2B7CE8" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#19F0D8" stopOpacity="0.2" />
              </linearGradient>
            </defs>
            <line x1="0" y1="1" x2="100%" y2="1" stroke="url(#workflow-line)" strokeWidth="2" />
          </svg>
        </div>
      </div>
    </section>
  );
}
