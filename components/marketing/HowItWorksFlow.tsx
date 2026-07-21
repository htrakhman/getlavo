import Link from 'next/link';

/* ─── Shared data (infographic-aligned) ─────────────────────────────────── */

export const AUDIENCES = [
  {
    id: 'building',
    title: 'Buildings',
    icon: 'building',
    bullets: [
      'Add Lavo as an amenity for free',
      'Connect with a local wash operator in your area',
      'Share booking links and QR codes with residents',
    ],
    href: '/buildings',
    cta: 'For property managers',
  },
  {
    id: 'resident',
    title: 'Residents',
    icon: 'resident',
    bullets: [
      'Book washes from the mobile app',
      'Add your car and parking spot details',
      'Choose a time slot and pay online',
    ],
    href: '/signup?role=resident',
    cta: 'Book a wash',
  },
  {
    id: 'operator',
    title: 'Operators',
    icon: 'operator',
    bullets: [
      'Perform washes on-site at partnered buildings',
      'Follow the building handoff process on wash day',
      'Get paid after the job is completed and reviewed',
    ],
    href: '/operators',
    cta: 'Join the network',
  },
] as const;

const PHASES = [
  {
    id: 'setup',
    label: 'Setup',
    title: 'Building launches Lavo',
    summary: 'Property adds the service for free, partners with a local operator, and shares a QR code or resident link.',
    actors: ['Building', 'Operator'],
  },
  {
    id: 'book',
    label: 'Book',
    title: 'Resident books & pays',
    summary: 'Resident signs up via the building link, adds vehicle and parking spot, picks a wash day or open slot, and pays online.',
    actors: ['Resident'],
  },
  {
    id: 'wash',
    label: 'Wash day',
    title: 'Move, wash, return',
    summary: 'Operator follows the property handoff, moves the car, washes it with photo proof, and returns it to the spot.',
    actors: ['Building', 'Resident', 'Operator'],
  },
  {
    id: 'done',
    label: 'Done',
    title: 'Review & payout',
    summary: 'Resident gets a completion notice and can leave a star review; that unlocks operator payout through Stripe.',
    actors: ['Resident', 'Operator'],
  },
] as const;

export const PRICING_MODEL = [
  { role: 'Buildings', price: '$0', detail: 'Free amenity — no subscription or setup fee' },
  { role: 'Residents', price: 'Per wash', detail: 'Pay only for washes you book online' },
  { role: 'Operators', price: 'After review', detail: 'Payout once the job is completed and reviewed' },
] as const;

/* ─── Icons ─────────────────────────────────────────────────────────────── */

function BuildingIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect x="4" y="3" width="24" height="26" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9" y="8" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.25" />
      <rect x="19" y="8" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.25" />
      <rect x="9" y="16" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.25" />
      <rect x="19" y="16" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.25" />
      <rect x="13" y="23" width="6" height="6" rx="0.5" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}

function OperatorIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
      <path
        d="M6 10 Q6 6 10 6 L18 6 Q20 6 21 8 L26 18 Q27 20 26 22 L26 26 Q26 27 25 27 L7 27 Q6 27 6 26 Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="27" r="3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="22" cy="27" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 18 L26 18" stroke="currentColor" strokeWidth="1.25" />
      <path d="M18 6 L22 18" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}

function ResidentIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
      <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="16" cy="12" r="4" stroke="currentColor" strokeWidth="1.25" />
      <path d="M7 25 Q8 20 16 20 Q24 20 25 25" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

function AudienceIcon({ type }: { type: (typeof AUDIENCES)[number]['icon'] }) {
  if (type === 'building') return <BuildingIcon />;
  if (type === 'operator') return <OperatorIcon />;
  return <ResidentIcon />;
}

function Arrow({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`shrink-0 text-ink-500 ${className}`}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M5 12h12M13 8l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ActorTag({ name }: { name: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-ink-400">
      {name}
    </span>
  );
}

/* ─── Audience cards ──────────────────────────────────────────────────────── */

export function HowItWorksAudiences({ showLinks = true }: { showLinks?: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {AUDIENCES.map((audience) => (
        <article key={audience.id} className="card flex flex-col p-8">
          <div className="mb-4 text-gleam">
            <AudienceIcon type={audience.icon} />
          </div>
          <h3 className="font-display text-2xl text-ink-100">{audience.title}</h3>
          <ul className="mt-4 flex-1 space-y-2.5 text-sm leading-relaxed text-ink-300">
            {audience.bullets.map((line) => (
              <li key={line} className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gleam/70" aria-hidden />
                <span>{line}</span>
              </li>
            ))}
          </ul>
          {showLinks && (
            <Link href={audience.href} className="mt-6 text-sm text-gleam hover:underline">
              {audience.cta} →
            </Link>
          )}
        </article>
      ))}
    </div>
  );
}

/* ─── Platform entity diagram ───────────────────────────────────────────── */

function PlatformNode({
  x,
  y,
  w,
  h,
  label,
  highlight = false,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  highlight?: boolean;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx="6"
        className={
          highlight
            ? 'fill-gleam/15 stroke-gleam/60'
            : 'fill-ink-900 stroke-white/20'
        }
        strokeWidth="1.5"
      />
      <text
        x={x + w / 2}
        y={y + h / 2 + 4}
        textAnchor="middle"
        className={highlight ? 'fill-gleam text-[10px] font-semibold' : 'fill-ink-100 text-[10px] font-medium'}
      >
        {label}
      </text>
    </g>
  );
}

function DiagramLine({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke="currentColor"
      strokeWidth="1"
      className="text-gleam/35"
    />
  );
}

/** Lavo platform data model — how entities connect in the product. */
export function HowItWorksPlatformDiagram() {
  const cx = 200;
  const cy = 130;
  return (
    <div className="rounded-xl border border-white/10 bg-ink-900/40 p-5 sm:p-6">
      <h3 className="text-center font-display text-lg text-ink-100">Lavo platform</h3>
      <p className="mx-auto mt-2 max-w-md text-center text-xs text-ink-500">
        How setup, bookings, wash days, and payouts connect in one system.
      </p>
      <svg
        viewBox="0 0 400 260"
        className="mx-auto mt-6 w-full max-w-lg text-ink-300"
        role="img"
        aria-label="Platform diagram: Setup links to Booking, Parking Spot, and QR Link. Booking connects Wash Day, Vehicle, Operator Match. Wash Day connects Review and Payout."
      >
        <DiagramLine x1={80} y1={55} x2={cx} y2={cy - 20} />
        <DiagramLine x1={320} y1={55} x2={cx} y2={cy - 20} />
        <DiagramLine x1={cx} y1={cy + 28} x2={cx} y2={200} />
        <DiagramLine x1={cx - 55} y1={cy} x2={95} y2={175} />
        <DiagramLine x1={cx + 55} y1={cy} x2={305} y2={175} />
        <DiagramLine x1={95} y1={195} x2={130} y2={195} />
        <DiagramLine x1={270} y1={195} x2={305} y2={195} />
        <DiagramLine x1={cx} y1={200} x2={305} y2={210} />
        <DiagramLine x1={305} y1={230} x2={340} y2={230} />

        <PlatformNode x={48} y={32} w={64} h={28} label="Setup" />
        <PlatformNode x={288} y={32} w={72} h={28} label="QR Link" />
        <PlatformNode x={cx - 40} y={cy - 14} w={80} h={28} label="Booking" highlight />
        <PlatformNode x={cx - 44} y={188} w={88} h={28} label="Wash Day" />
        <PlatformNode x={48} y={178} w={56} h={28} label="Vehicle" />
        <PlatformNode x={128} y={178} w={88} h={28} label="Parking Spot" />
        <PlatformNode x={268} y={178} w={96} h={28} label="Operator Match" />
        <PlatformNode x={308} y={214} w={56} h={28} label="Review" />
        <PlatformNode x={368} y={214} w={56} h={28} label="Payout" />
      </svg>
    </div>
  );
}

/* ─── Four-phase flow ───────────────────────────────────────────────────── */

function ProcessPhasesBar() {
  return (
    <>
      <div className="hidden lg:flex lg:items-stretch lg:gap-2">
        {PHASES.map((phase, i) => (
          <div key={phase.id} className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex min-h-[140px] min-w-0 flex-1 flex-col rounded-xl border border-white/10 bg-ink-900/60 p-4">
              <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-gleam">{phase.label}</div>
              <h3 className="mt-2 font-display text-base leading-snug text-ink-100">{phase.title}</h3>
              <p className="mt-2 flex-1 text-xs leading-relaxed text-ink-400">{phase.summary}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {phase.actors.map((a) => (
                  <ActorTag key={a} name={a} />
                ))}
              </div>
            </div>
            {i < PHASES.length - 1 && <Arrow className="mx-0.5" />}
          </div>
        ))}
      </div>

      <ol className="space-y-3 lg:hidden">
        {PHASES.map((phase, i) => (
          <li key={phase.id}>
            <div className="rounded-xl border border-white/10 bg-ink-900/60 p-4">
              <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-gleam">{phase.label}</div>
              <h3 className="mt-2 font-display text-lg text-ink-100">{phase.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-400">{phase.summary}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {phase.actors.map((a) => (
                  <ActorTag key={a} name={a} />
                ))}
              </div>
            </div>
            {i < PHASES.length - 1 && (
              <div className="flex justify-center py-1" aria-hidden>
                <Arrow className="rotate-90" />
              </div>
            )}
          </li>
        ))}
      </ol>
    </>
  );
}

/* ─── Who pays ──────────────────────────────────────────────────────────── */

export function HowItWorksPricing() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {PRICING_MODEL.map((row) => (
        <div
          key={row.role}
          className="rounded-xl border border-white/10 bg-ink-900/50 px-5 py-4 text-center"
        >
          <div className="text-xs font-medium uppercase tracking-[0.16em] text-ink-500">{row.role}</div>
          <div className="mt-2 font-display text-2xl text-gleam">{row.price}</div>
          <p className="mt-2 text-xs leading-relaxed text-ink-400">{row.detail}</p>
        </div>
      ))}
    </div>
  );
}

/* ─── Main sections ─────────────────────────────────────────────────────── */

type HowLavoWorksProps = {
  /** full = dedicated page; compact = homepage embed */
  variant?: 'full' | 'compact';
};

/** Complete “How Lavo Works” infographic — audiences, platform, flow, pricing. */
export function HowLavoWorks({ variant = 'full' }: HowLavoWorksProps) {
  const isFull = variant === 'full';

  return (
    <div className="space-y-10">
      <div>
        <div className="mb-8 text-center">
          <div className="text-xs uppercase tracking-[0.18em] text-gleam">Audiences</div>
          <h2 className="mt-2 font-display text-2xl sm:text-3xl">Three groups, one platform</h2>
          {isFull && (
            <p className="mx-auto mt-2 max-w-lg text-sm text-ink-400">
              Buildings launch the amenity, residents book from their phones, and operators run wash days on site.
            </p>
          )}
        </div>
        <HowItWorksAudiences showLinks={isFull} />
      </div>

      {isFull && <HowItWorksPlatformDiagram />}

      <div className="card overflow-hidden p-6 sm:p-8 ring-1 ring-inset ring-white/[0.04]">
        <div className="mb-8 text-center">
          <div className="text-xs uppercase tracking-[0.18em] text-gleam">Process</div>
          <h2 className="mt-2 font-display text-2xl sm:text-3xl">From setup to payout</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-ink-400">
            Four steps: building launch, resident booking, wash day service, then review and operator payout.
          </p>
        </div>
        <ProcessPhasesBar />
      </div>

      <div>
        <div className="mb-6 text-center">
          <div className="text-xs uppercase tracking-[0.18em] text-gleam">Pricing</div>
          <h2 className="mt-2 font-display text-xl sm:text-2xl">Who pays what</h2>
        </div>
        <HowItWorksPricing />
      </div>

      {!isFull && (
        <p className="text-center">
          <Link href="/how-it-works" className="text-sm text-gleam hover:underline">
            See the full platform diagram and step-by-step guide →
          </Link>
        </p>
      )}
    </div>
  );
}

/** @deprecated Use HowLavoWorks — kept for imports that expect the name. */
export function HowItWorksFlow() {
  return <HowLavoWorks variant="full" />;
}

const WASH_DAY_STEPS = [
  { label: 'Parked in spot', detail: 'Resident books; car stays in assigned garage or lot space.' },
  { label: 'Key / concierge', detail: 'Building protocol: keys or handoff before crew starts.' },
  { label: 'Wash area', detail: 'Operator moves vehicle to the approved service area.' },
  { label: 'Wash & photos', detail: 'Service plus before/after photos in the crew tool.' },
  { label: 'Back in spot', detail: 'Vehicle returned; resident notified when marked done.' },
] as const;

/** Wash-day vehicle movement — lives inside the wash-day phase, not as a standalone topic. */
export function WashDayAccessFlow() {
  return (
    <div className="rounded-xl border border-white/10 bg-ink-900/40 p-5 sm:p-6">
      <h3 className="font-display text-lg text-ink-100">What happens to your car on wash day</h3>
      <p className="mt-2 text-sm text-ink-400">
        Most buildings use a handoff so you do not need to wait with the crew. The property sets the rules; your
        partnered operator follows them for every booked vehicle.
      </p>

      <div className="mt-6 hidden sm:flex sm:items-start sm:gap-1">
        {WASH_DAY_STEPS.map((step, i) => (
          <div key={step.label} className="flex min-w-0 flex-1 items-start gap-1">
            <div className="min-w-0 flex-1 text-center">
              <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full border border-gleam/30 bg-gleam/10 text-xs font-medium text-gleam">
                {i + 1}
              </div>
              <div className="mt-2 text-xs font-medium text-ink-200">{step.label}</div>
              <p className="mt-1 text-[10px] leading-snug text-ink-500">{step.detail}</p>
            </div>
            {i < WASH_DAY_STEPS.length - 1 && <Arrow className="mt-2.5 w-4 shrink-0 opacity-60" />}
          </div>
        ))}
      </div>

      <ol className="mt-4 space-y-3 sm:hidden">
        {WASH_DAY_STEPS.map((step, i) => (
          <li key={step.label} className="flex gap-3 text-sm">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gleam/30 bg-gleam/10 text-xs text-gleam">
              {i + 1}
            </span>
            <div>
              <div className="font-medium text-ink-200">{step.label}</div>
              <p className="mt-0.5 text-xs text-ink-500">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-6 border-t border-white/10 pt-4 text-xs leading-relaxed text-ink-500">
        Liability for vehicle damage during service—including movement to and from the wash area—is assigned to the
        operator under building–operator terms.{' '}
        <Link href="/legal/damage-policy" className="text-gleam hover:underline">
          Damage policy
        </Link>
      </p>
    </div>
  );
}

export const PROCESS_PHASES = [
  {
    id: 'setup',
    phaseLabel: 'Phase 1 · Setup',
    title: 'Building launches Lavo',
    steps: [
      {
        who: 'Building manager',
        title: 'Building adds Lavo',
        body: 'Sign up free (no credit card), enter the address, and get a unique QR code and landing page link for residents.',
      },
      {
        who: 'Building manager',
        title: 'Building connects a local operator',
        body: 'Browse nearby operators within the building radius, send a partnership request, and the operator accepts.',
      },
    ],
  },
  {
    id: 'book',
    phaseLabel: 'Phase 2 · Book',
    title: 'Residents book a wash',
    steps: [
      {
        who: 'Resident',
        title: 'Scan, sign up, add vehicle',
        body: 'Open the building QR or link, create an account, and enter unit number plus vehicle and parking spot details.',
      },
      {
        who: 'Resident',
        title: 'Pick a time slot & pay',
        body: 'Choose a building wash day (often lower rate) or an on-demand open slot. Stripe processes payment online and the booking is confirmed instantly.',
      },
    ],
  },
  {
    id: 'wash',
    phaseLabel: 'Phase 3 · Wash day',
    title: 'Service on site',
    steps: [
      {
        who: 'Building & resident',
        title: 'Access handoff',
        body: 'Follow the property wash-day protocol—key drop, concierge, or another approved method—before the crew starts on that vehicle.',
      },
      {
        who: 'Operator',
        title: 'Move, wash, photograph, return',
        body: 'Crew tool lists every booking with spot, plate, and vehicle details. Operator moves the car per building rules, completes the wash with photos, returns it to the spot, and marks done. Resident is notified.',
      },
    ],
    showWashDayDiagram: true,
  },
  {
    id: 'done',
    phaseLabel: 'Phase 4 · Done',
    title: 'Review & payout',
    steps: [
      {
        who: 'Resident',
        title: 'Star rating & review',
        body: 'Wash appears in history with photos. Leave a rating or one-tap rebook with the same operator.',
      },
      {
        who: 'Operator',
        title: 'Payout after review',
        body: 'Each completed booking creates a payout line (gross minus Lavo fee). Funds transfer to the connected bank account on a regular schedule once the job is reviewed.',
      },
    ],
  },
] as const;
