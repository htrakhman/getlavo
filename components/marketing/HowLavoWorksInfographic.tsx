import Link from 'next/link';
import type { ComponentType } from 'react';

/* ─── Content (matches original infographic) ───────────────────────────── */

const SIDEBAR_ROLES = [
  {
    id: 'building',
    label: 'For buildings',
    body: 'Add Lavo for free, connect a local mobile wash operator, and share a resident booking link or QR code.',
    Icon: IconBuilding,
  },
  {
    id: 'resident',
    label: 'For residents',
    body: 'Book from your phone, add your car and parking spot, choose a wash day or open slot, and pay in the app.',
    Icon: IconResident,
  },
  {
    id: 'operator',
    label: 'For operators',
    body: 'Run wash days in the building garage or lot, follow the handoff process, complete the wash, and get paid after the job.',
    Icon: IconVan,
  },
] as const;

const AUDIENCE_CHIPS = [
  { label: 'Building', Icon: IconBuilding },
  { label: 'Resident', Icon: IconResident },
  { label: 'Operator', Icon: IconVan },
] as const;

const PLATFORM_NODES: {
  id: string;
  label: string;
  x: number;
  y: number;
  hub?: boolean;
  Icon: ComponentType<{ className?: string }>;
}[] = [
  { id: 'setup', label: 'Setup', x: 72, y: 36, Icon: IconGear },
  { id: 'qr', label: 'QR Link', x: 328, y: 36, Icon: IconQr },
  { id: 'booking', label: 'Booking', x: 200, y: 72, hub: true, Icon: IconCalendar },
  { id: 'vehicle', label: 'Vehicle', x: 56, y: 148, Icon: IconCar },
  { id: 'spot', label: 'Parking Spot', x: 148, y: 168, Icon: IconPin },
  { id: 'wash', label: 'Wash Day', x: 200, y: 148, Icon: IconDroplet },
  { id: 'match', label: 'Operator Match', x: 312, y: 148, Icon: IconPeople },
  { id: 'review', label: 'Review', x: 272, y: 208, Icon: IconStar },
  { id: 'payout', label: 'Payout', x: 344, y: 208, Icon: IconDollar },
];

const PLATFORM_EDGES: [string, string][] = [
  ['setup', 'booking'],
  ['qr', 'booking'],
  ['booking', 'wash'],
  ['booking', 'vehicle'],
  ['booking', 'match'],
  ['vehicle', 'spot'],
  ['wash', 'vehicle'],
  ['wash', 'match'],
  ['wash', 'review'],
  ['review', 'payout'],
  ['match', 'payout'],
];

const STEPS = [
  {
    n: 1,
    label: 'Setup',
    body: 'Building launches Lavo and shares QR.',
    Scene: SceneSetup,
  },
  {
    n: 2,
    label: 'Book',
    body: 'Resident books and pays in app.',
    Scene: SceneBook,
  },
  {
    n: 3,
    label: 'Wash day',
    body: 'Car is moved, washed, photographed, and returned.',
    Scene: SceneWashDay,
  },
  {
    n: 4,
    label: 'Done',
    body: 'Resident reviews, operator gets paid.',
    Scene: SceneDone,
  },
] as const;

const PRICING = [
  { role: 'Buildings', value: '$0', detail: 'Buildings pay $0', Icon: IconDollar },
  { role: 'Residents', value: 'Per wash', detail: 'Residents pay only for washes they book', Icon: IconResident },
  { role: 'Operators', value: 'After job', detail: 'Operators are paid after the job', Icon: IconVan },
] as const;

/* ─── Icons ─────────────────────────────────────────────────────────────── */

function IconBuilding({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="3" width="16" height="18" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="8" y="7" width="3" height="3" rx="0.5" stroke="currentColor" strokeWidth="1.25" />
      <rect x="13" y="7" width="3" height="3" rx="0.5" stroke="currentColor" strokeWidth="1.25" />
      <rect x="10" y="15" width="4" height="6" rx="0.5" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}

function IconResident({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 20c1-4 4-6 7-6s6 2 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconVan({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 9h12l2 5h4v5H4V9z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="19" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="18" cy="19" r="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconGear({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.25" />
      <path
        d="M10 2v2M10 16v2M2 10h2M16 10h2M4.9 4.9l1.4 1.4M13.7 13.7l1.4 1.4M4.9 15.1l1.4-1.4M13.7 6.3l1.4-1.4"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconQr({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="3" y="3" width="6" height="6" stroke="currentColor" strokeWidth="1.25" />
      <rect x="11" y="3" width="6" height="6" stroke="currentColor" strokeWidth="1.25" />
      <rect x="3" y="11" width="6" height="6" stroke="currentColor" strokeWidth="1.25" />
      <path d="M13 13h2v2h-2zM15 15h2v2h-2z" fill="currentColor" />
    </svg>
  );
}

function IconCalendar({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="3" y="4" width="14" height="13" rx="1" stroke="currentColor" strokeWidth="1.25" />
      <path d="M3 8h14M7 2v3M13 2v3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

function IconCar({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M3 11h14l-1-4H6L3 11z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <circle cx="6" cy="13" r="1.5" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="14" cy="13" r="1.5" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}

function IconPin({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M10 17s-5-4.5-5-8a5 5 0 1110 0c0 3.5-5 8-5 8z"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <circle cx="10" cy="9" r="1.5" fill="currentColor" />
    </svg>
  );
}

function IconDroplet({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M10 3c3 4 5 6.5 5 9a5 5 0 01-10 0c0-2.5 2-5 5-9z"
        stroke="currentColor"
        strokeWidth="1.25"
      />
    </svg>
  );
}

function IconPeople({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="7" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="13" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.25" />
      <path d="M2 16c1-3 3-4 5-4M13 12c2 0 4 1 5 4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

function IconStar({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M10 3l2 5h5l-4 3 1.5 5L10 13l-4.5 3L7 11 3 8h5l2-5z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconDollar({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M10 3v14M7 6h4a2 2 0 010 4H8a2 2 0 000 4h5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ─── Step scene illustrations ──────────────────────────────────────────── */

function SceneSetup({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 72" fill="none" aria-hidden>
      <rect x="8" y="20" width="28" height="40" rx="2" stroke="currentColor" strokeWidth="1.25" className="text-ink-400" />
      <rect x="14" y="28" width="6" height="6" rx="0.5" stroke="currentColor" strokeWidth="1" className="text-ink-500" />
      <rect x="48" y="12" width="32" height="52" rx="4" stroke="currentColor" strokeWidth="1.25" className="text-gleam/70" />
      <rect x="54" y="22" width="20" height="20" rx="1" stroke="currentColor" strokeWidth="1" className="text-gleam" />
      <path d="M58 26h4v4h-4zM62 26h4v4h-4zM58 30h4v4h-4z" fill="currentColor" className="text-gleam/80" />
      <path d="M88 36h20" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" className="text-ink-600" />
    </svg>
  );
}

function SceneBook({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 72" fill="none" aria-hidden>
      <rect x="36" y="10" width="36" height="52" rx="5" stroke="currentColor" strokeWidth="1.25" className="text-gleam/70" />
      <rect x="42" y="18" width="24" height="14" rx="1" stroke="currentColor" strokeWidth="1" className="text-ink-400" />
      <path d="M44 22h8M44 26h12" stroke="currentColor" strokeWidth="1" className="text-ink-500" />
      <rect x="78" y="28" width="28" height="18" rx="2" stroke="currentColor" strokeWidth="1.25" className="text-gleam" />
      <path d="M82 36h16" stroke="currentColor" strokeWidth="1.25" className="text-ink-300" />
    </svg>
  );
}

function SceneWashDay({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 72" fill="none" aria-hidden>
      <path d="M8 52h80" stroke="currentColor" strokeWidth="1" className="text-ink-600" />
      <path
        d="M24 52h40l8-16H32l-8 16z"
        stroke="currentColor"
        strokeWidth="1.25"
        className="text-ink-300"
      />
      <circle cx="30" cy="52" r="4" stroke="currentColor" strokeWidth="1.25" className="text-ink-400" />
      <circle cx="58" cy="52" r="4" stroke="currentColor" strokeWidth="1.25" className="text-ink-400" />
      <path d="M72 28c4-8 12-8 16 0" stroke="currentColor" strokeWidth="1.25" className="text-gleam" strokeLinecap="round" />
      <circle cx="88" cy="40" r="6" stroke="currentColor" strokeWidth="1.25" className="text-ink-400" />
    </svg>
  );
}

function SceneDone({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 72" fill="none" aria-hidden>
      <rect x="28" y="10" width="36" height="52" rx="5" stroke="currentColor" strokeWidth="1.25" className="text-gleam/70" />
      <path
        d="M38 32l4 4 8-10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-gleam"
      />
      <path
        d="M40 24l2 3 4-6"
        stroke="currentColor"
        strokeWidth="1"
        className="text-gleam/60"
        strokeLinecap="round"
      />
      <circle cx="88" cy="40" r="14" stroke="currentColor" strokeWidth="1.25" className="text-gleam/50" />
      <path d="M88 34v8M84 38h8" stroke="currentColor" strokeWidth="1.25" className="text-gleam" strokeLinecap="round" />
    </svg>
  );
}

/* ─── Platform diagram ──────────────────────────────────────────────────── */

function nodeCenter(id: string) {
  const n = PLATFORM_NODES.find((x) => x.id === id)!;
  return { x: n.x, y: n.y };
}

function PlatformNodeChip({
  node,
}: {
  node: (typeof PLATFORM_NODES)[number];
}) {
  const { Icon } = node;
  return (
    <div
      className={`absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-lg border px-2 py-1.5 shadow-card backdrop-blur-sm ${
        node.hub
          ? 'border-gleam/40 bg-gleam/10 text-ink-100'
          : 'border-white/10 bg-ink-900/95 text-ink-200'
      }`}
      style={{ left: `${(node.x / 400) * 100}%`, top: `${(node.y / 240) * 100}%` }}
    >
      <span className={node.hub ? 'text-gleam' : 'text-gleam/80'}>
        <Icon />
      </span>
      <span className="whitespace-nowrap text-[10px] font-medium leading-none">{node.label}</span>
    </div>
  );
}

function PlatformDiagram() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-ink-900/80 p-4 sm:p-5">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)',
          backgroundSize: '20px 20px',
        }}
      />
      <div className="relative mb-3 flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-gleam">Lavo platform</span>
        <span className="font-display text-sm font-semibold tracking-wide text-ink-100">LAVO</span>
      </div>

      <div className="relative mx-auto aspect-[5/3] w-full max-w-xl min-h-[200px] sm:min-h-[240px]">
        <svg
          viewBox="0 0 400 240"
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden
        >
          <path
            d="M24 32 L376 48 L360 220 L40 208 Z"
            fill="rgba(25,240,216,0.04)"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />
          {PLATFORM_EDGES.map(([a, b]) => {
            const p1 = nodeCenter(a);
            const p2 = nodeCenter(b);
            return (
              <line
                key={`${a}-${b}`}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke="rgba(25,240,216,0.22)"
                strokeWidth="1"
              />
            );
          })}
        </svg>
        {PLATFORM_NODES.map((node) => (
          <PlatformNodeChip key={node.id} node={node} />
        ))}
      </div>
    </div>
  );
}

/* ─── Sub-sections ──────────────────────────────────────────────────────── */

function AudienceRow() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {AUDIENCE_CHIPS.map(({ label, Icon }) => (
        <div
          key={label}
          className="flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-ink-900/60 px-4 py-3 text-sm font-medium text-ink-100 ring-1 ring-inset ring-white/[0.04]"
        >
          <span className="text-gleam">
            <Icon />
          </span>
          {label}
        </div>
      ))}
    </div>
  );
}

function StepCard({
  n,
  label,
  body,
  Scene,
}: {
  n: number;
  label: string;
  body: string;
  Scene: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex min-w-0 flex-col rounded-xl border border-white/10 bg-ink-900/50 p-4 ring-1 ring-inset ring-white/[0.04]">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gleam/35 bg-gleam/10 font-display text-xs font-semibold text-gleam">
          {n}
        </span>
        <span className="font-display text-sm font-medium text-ink-100">{label}</span>
      </div>
      <Scene className="mx-auto mb-3 h-14 w-full max-w-[120px] text-ink-400" />
      <p className="text-center text-xs leading-relaxed text-ink-400">{body}</p>
    </div>
  );
}

function Sidebar() {
  return (
    <aside className="border-b border-white/10 bg-ink-950/60 p-6 lg:border-b-0 lg:border-r lg:p-8">
      <h2 className="font-display text-2xl font-semibold tracking-tight text-ink-100 lg:text-3xl" id="how-lavo-works-title">
        How Lavo works
      </h2>
      <p className="mt-2 text-sm text-ink-400">Apartment car wash, made simple.</p>
      <ul className="mt-8 space-y-0 divide-y divide-white/10">
        {SIDEBAR_ROLES.map(({ id, label, body, Icon }) => (
          <li key={id} className="py-5 first:pt-0 last:pb-0">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gleam/25 bg-gleam/5 text-gleam">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-sm font-medium text-ink-100">{label}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-400">{body}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}

/* ─── Main export ───────────────────────────────────────────────────────── */

type Props = {
  className?: string;
  showSidebar?: boolean;
};

/**
 * Site-native “How Lavo Works” — matches Lavo marketing (ink + gleam, cards, Space Grotesk).
 */
export function HowLavoWorksInfographic({ className = '', showSidebar = true }: Props) {
  return (
    <figure
      className={`mx-auto w-full max-w-6xl ${className}`.trim()}
      aria-label="How Lavo Works: buildings, residents, and operators on one platform"
    >
      <div className="card overflow-hidden ring-1 ring-inset ring-white/[0.06]">
        <div
          className={
            showSidebar
              ? 'grid lg:grid-cols-[minmax(260px,300px)_1fr]'
              : 'grid grid-cols-1'
          }
        >
          {showSidebar && <Sidebar />}

          <div className="flex flex-col gap-8 p-6 sm:p-8">
            {/* Audiences → platform */}
            <div className="relative">
              <AudienceRow />
            </div>

            <PlatformDiagram />

            {/* Four steps */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step) => (
                <StepCard key={step.n} {...step} />
              ))}
            </div>

            {/* Pricing footer */}
            <div className="grid grid-cols-1 gap-3 border-t border-white/10 pt-6 sm:grid-cols-3">
              {PRICING.map(({ role, value, detail, Icon }) => (
                <div
                  key={role}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gleam/30 bg-gleam/10 text-gleam">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="font-display text-sm font-medium text-gleam">{value}</div>
                    <p className="text-[11px] leading-snug text-ink-400">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <figcaption className="sr-only">
        How Lavo Works: buildings add Lavo for free, residents book in the app, operators run wash days. Platform
        connects booking, wash day, vehicle, payout. Four steps: setup, book, wash day, done.
      </figcaption>
    </figure>
  );
}

/** Compact strip for homepage — platform + steps, no sidebar. */
export function HowLavoWorksPreview({ className = '' }: { className?: string }) {
  return (
    <div className={className}>
      <HowLavoWorksInfographic showSidebar={false} />
      <p className="mt-6 text-center">
        <Link href="/how-it-works" className="text-sm text-gleam hover:underline">
          Full guide with step-by-step details →
        </Link>
      </p>
    </div>
  );
}
