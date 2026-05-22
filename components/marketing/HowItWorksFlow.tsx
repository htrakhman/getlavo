import Link from 'next/link';

const PHASES = [
  {
    id: 'setup',
    label: '1 · Setup',
    title: 'Building & operator connect',
    summary: 'Property adds Lavo for free, picks a local operator, and shares the resident QR or link.',
    actors: ['Building', 'Operator'],
  },
  {
    id: 'book',
    label: '2 · Book',
    title: 'Residents sign up & pay',
    summary: 'Residents join via the building link, add their vehicle, pick a wash day or open slot, and pay in the app.',
    actors: ['Resident'],
  },
  {
    id: 'wash',
    label: '3 · Wash day',
    title: 'Access, wash, return',
    summary: 'Building and resident follow the property handoff so the crew can move, wash, and return the car.',
    actors: ['Building', 'Resident', 'Operator'],
  },
  {
    id: 'done',
    label: '4 · Done',
    title: 'Review & payout',
    summary: 'Resident gets completion notice and can review; operator receives payout through Stripe.',
    actors: ['Resident', 'Operator'],
  },
] as const;

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

/** High-level platform flow — four phases with connecting arrows. */
export function HowItWorksFlow() {
  return (
    <div className="card overflow-hidden p-6 sm:p-8 ring-1 ring-inset ring-white/[0.04]">
      <div className="mb-8 text-center">
        <div className="text-xs uppercase tracking-[0.18em] text-gleam">Overview</div>
        <h2 className="mt-2 font-display text-2xl sm:text-3xl">How the process flows</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-ink-400">
          One loop from building launch to resident booking, wash day service, and payout.
        </p>
      </div>

      {/* Desktop: horizontal */}
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

      {/* Mobile / tablet: vertical */}
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

      {/* Triangle relationship diagram */}
      <div className="mt-10 border-t border-white/10 pt-8">
        <p className="mb-6 text-center text-xs text-ink-500">Who connects to whom</p>
        <div className="relative mx-auto max-w-md">
          <svg viewBox="0 0 320 200" className="w-full text-ink-300" role="img" aria-label="Building partners with operator; residents book through building; operator serves residents on wash day">
            <defs>
              <marker id="flow-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                <path d="M0 0 L8 4 L0 8 Z" fill="currentColor" className="text-gleam/60" />
              </marker>
            </defs>
            {/* Building */}
            <rect x="110" y="8" width="100" height="44" rx="8" className="fill-ink-900 stroke-gleam/40" strokeWidth="1.5" />
            <text x="160" y="28" textAnchor="middle" className="fill-ink-100 text-[11px] font-medium">Building</text>
            <text x="160" y="42" textAnchor="middle" className="fill-ink-400 text-[9px]">Adds Lavo · shares QR</text>
            {/* Operator */}
            <rect x="8" y="128" width="100" height="44" rx="8" className="fill-ink-900 stroke-white/20" strokeWidth="1.5" />
            <text x="58" y="148" textAnchor="middle" className="fill-ink-100 text-[11px] font-medium">Operator</text>
            <text x="58" y="162" textAnchor="middle" className="fill-ink-400 text-[9px]">Partners · runs wash</text>
            {/* Resident */}
            <rect x="212" y="128" width="100" height="44" rx="8" className="fill-ink-900 stroke-white/20" strokeWidth="1.5" />
            <text x="262" y="148" textAnchor="middle" className="fill-ink-100 text-[11px] font-medium">Resident</text>
            <text x="262" y="162" textAnchor="middle" className="fill-ink-400 text-[9px]">Books · pays in app</text>
            {/* Arrows */}
            <line x1="145" y1="52" x2="75" y2="125" stroke="currentColor" strokeWidth="1.25" markerEnd="url(#flow-arrow)" className="text-gleam/50" />
            <text x="95" y="88" className="fill-ink-500 text-[8px]">partners</text>
            <line x1="175" y1="52" x2="245" y2="125" stroke="currentColor" strokeWidth="1.25" markerEnd="url(#flow-arrow)" className="text-gleam/50" />
            <text x="218" y="88" className="fill-ink-500 text-[8px]">resident link</text>
            <line x1="108" y1="150" x2="212" y2="150" stroke="currentColor" strokeWidth="1.25" markerEnd="url(#flow-arrow)" className="text-gleam/50" />
            <text x="160" y="142" textAnchor="middle" className="fill-ink-500 text-[8px]">wash day</text>
          </svg>
        </div>
      </div>
    </div>
  );
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
            {i < WASH_DAY_STEPS.length - 1 && (
              <Arrow className="mt-2.5 w-4 shrink-0 opacity-60" />
            )}
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
    phaseLabel: 'Phase 2 · Booking',
    title: 'Residents book a wash',
    steps: [
      {
        who: 'Resident',
        title: 'Scan, sign up, add vehicle',
        body: 'Open the building QR or link, create an account, and enter unit number plus vehicle and parking spot details.',
      },
      {
        who: 'Resident',
        title: 'Pick a date & pay',
        body: 'Choose a building wash day (often lower rate) or an on-demand open slot. Stripe processes payment in the app; Lavo retains 15–20% platform fee and queues the rest for the operator.',
      },
    ],
  },
  {
    id: 'wash',
    phaseLabel: 'Phase 3 · Wash day',
    title: 'Service day',
    steps: [
      {
        who: 'Building & resident',
        title: 'Access handoff',
        body: 'Follow the property wash-day protocol—key drop, concierge, or another approved method—before the crew starts on that vehicle.',
      },
      {
        who: 'Operator',
        title: 'Move, wash, return, mark done',
        body: 'Crew tool lists every booking with spot, plate, and vehicle details. Operator moves the car per building rules, completes the wash with photos, returns it, and marks done. Resident is notified.',
      },
    ],
    showWashDayDiagram: true,
  },
  {
    id: 'done',
    phaseLabel: 'Phase 4 · After service',
    title: 'Wrap-up',
    steps: [
      {
        who: 'Resident',
        title: 'Review or rebook',
        body: 'Wash appears in history with photos. Leave a rating or one-tap rebook with the same operator.',
      },
      {
        who: 'Operator',
        title: 'Payout',
        body: 'Each booking creates a payout line (gross minus Lavo fee). Funds transfer to the connected bank account on a regular schedule.',
      },
    ],
  },
] as const;
