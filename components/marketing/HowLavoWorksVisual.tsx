import Link from 'next/link';
import type { ReactNode } from 'react';

/* ─── Shared UI primitives ───────────────────────────────────────────────── */

function UiShell({
  title,
  children,
  className = '',
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-white/10 bg-ink-950/80 ring-1 ring-inset ring-white/[0.04] ${className}`.trim()}
    >
      <div className="flex items-center gap-2 border-b border-white/[0.06] bg-white/[0.02] px-3 py-2">
        <span className="h-1.5 w-1.5 rounded-full bg-gleam/60" aria-hidden />
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-400">{title}</span>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function StatusRow({
  label,
  value,
  highlight = false,
  large = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  large?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 leading-none">
      <span className={`${large ? 'text-xs' : 'text-[11px]'} text-ink-400`}>{label}</span>
      <span
        className={
          highlight
            ? `rounded-full border border-gleam/30 bg-gleam/10 font-medium text-gleam ${
                large ? 'px-2.5 py-1 text-sm' : 'px-2 py-0.5 text-[11px]'
              }`
            : `${large ? 'text-sm' : 'text-[11px]'} font-medium text-ink-200`
        }
      >
        {value}
      </span>
    </div>
  );
}

function CheckRow({ label, done = true }: { label: string; done?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
          done ? 'border-gleam/40 bg-gleam/10 text-gleam' : 'border-white/15 text-ink-500'
        }`}
        aria-hidden
      >
        {done ? (
          <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none">
            <path d="M2.5 6l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <span className="h-1 w-1 rounded-full bg-ink-500" />
        )}
      </span>
      <span className={done ? 'text-ink-200' : 'text-ink-400'}>{label}</span>
    </div>
  );
}

/* ─── Step mockups ───────────────────────────────────────────────────────── */

function BuildingSetupMockup() {
  return (
    <UiShell title="Building admin">
      <div className="space-y-2.5">
        <StatusRow label="Building cost" value="$0" highlight large />
        <StatusRow label="Amenity status" value="Live" highlight />
        <div className="flex items-start gap-3 pt-1">
          <div className="flex shrink-0 flex-col items-center gap-1">
            <div className="grid grid-cols-3 gap-0.5 rounded border border-white/10 bg-white/[0.03] p-1.5">
              {Array.from({ length: 9 }).map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 w-1.5 rounded-sm ${i % 3 === 0 || i === 4 ? 'bg-gleam/50' : 'bg-white/15'}`}
                  aria-hidden
                />
              ))}
            </div>
            <span className="font-mono text-[10px] text-ink-400">QR for residents</span>
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <CheckRow label="Vetted operator assigned" />
            <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-1.5">
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-ink-400" fill="none" aria-hidden>
                <rect x="5" y="3" width="14" height="18" rx="1" stroke="currentColor" strokeWidth="1.25" />
                <rect x="8" y="7" width="3" height="3" rx="0.25" stroke="currentColor" strokeWidth="1" />
                <rect x="13" y="7" width="3" height="3" rx="0.25" stroke="currentColor" strokeWidth="1" />
                <rect x="10" y="14" width="4" height="5" rx="0.25" stroke="currentColor" strokeWidth="1" />
              </svg>
              <span className="truncate text-xs text-ink-200">Resident booking link live</span>
            </div>
          </div>
        </div>
      </div>
    </UiShell>
  );
}

function ResidentBookingMockup() {
  return (
    <UiShell title="Resident app · Phone">
      <div className="mx-auto w-full max-w-[168px]">
        <div className="rounded-[20px] border-2 border-white/15 bg-ink-950 p-1.5 shadow-card">
          <div className="rounded-[14px] border border-white/10 bg-ink-900 p-3 ring-1 ring-inset ring-white/[0.05]">
            <div className="mx-auto mb-2 h-1 w-8 rounded-full bg-white/15" aria-hidden />
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-ink-200">Book wash</span>
              <span className="rounded-full bg-gleam/10 px-2 py-0.5 text-[10px] font-medium text-gleam">Booked</span>
            </div>
            <div className="space-y-2">
              <div className="rounded-md border border-gleam/30 bg-gleam/[0.07] px-2.5 py-2">
                <p className="text-xs font-medium text-ink-100">Exterior Wash</p>
                <p className="mt-0.5 text-[11px] text-ink-400">Today, 5:00 PM</p>
              </div>
              <div className="rounded-md border border-white/[0.06] bg-white/[0.02] px-2.5 py-2">
                <p className="text-[11px] text-ink-400">Parking spot</p>
                <p className="text-xs text-ink-200">Garage P2 · B14</p>
              </div>
            </div>
            <div className="mt-2.5 flex items-center justify-between rounded-md border border-gleam/20 bg-gleam/[0.06] px-2.5 py-1.5">
              <span className="text-[11px] text-ink-300">Payment</span>
              <span className="text-[11px] font-medium text-gleam">Confirmed</span>
            </div>
          </div>
        </div>
        <p className="mt-2 text-center text-[11px] font-medium text-ink-400">Book & pay from phone</p>
      </div>
    </UiShell>
  );
}

function WashDayMockup() {
  return (
    <UiShell title="Operator job · On site" className="border-gleam/20 bg-gradient-to-b from-gleam/[0.06] to-ink-950/90">
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-2">
          <div>
            <p className="text-xs font-medium text-ink-200">Bay City Mobile Wash</p>
            <p className="text-[11px] text-ink-400">Vetted local operator</p>
          </div>
          <span className="shrink-0 rounded-full border border-gleam/30 bg-gleam/10 px-2 py-0.5 text-[10px] font-medium text-gleam">
            On site
          </span>
        </div>
        <div className="relative overflow-hidden rounded-lg border border-white/10 bg-ink-900/90 px-3 py-3">
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)',
              backgroundSize: '12px 12px',
            }}
            aria-hidden
          />
          <div className="relative flex items-end justify-between gap-2">
            <div className="space-y-1">
              <p className="font-mono text-[10px] uppercase tracking-wider text-ink-400">Garage · Bay 3</p>
              <svg viewBox="0 0 80 36" className="h-10 w-[76px]" fill="none" aria-hidden>
                <path d="M4 28h72" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
                <path
                  d="M14 28h38l6-12H22l-8 12z"
                  stroke="rgba(228,232,240,0.55)"
                  strokeWidth="1.25"
                  strokeLinejoin="round"
                />
                <circle cx="22" cy="28" r="4" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
                <circle cx="48" cy="28" r="4" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
                <path d="M58 14c3-6 10-6 13 0" stroke="#19F0D8" strokeWidth="1.25" strokeLinecap="round" opacity="0.7" />
              </svg>
            </div>
            <span className="rounded-full border border-gleam/35 bg-gleam/10 px-2 py-0.5 text-[10px] font-medium text-gleam">
              Wash complete
            </span>
          </div>
        </div>
        <CheckRow label="Vehicle located in garage" />
        <CheckRow label="Operator completes wash" />
        <div className="flex items-center gap-1.5 pt-0.5">
          <span className="text-xs text-ink-400">Photos uploaded</span>
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-8 w-8 rounded border border-white/10 bg-gradient-to-br from-white/[0.08] to-gleam/[0.08]"
                aria-hidden
              />
            ))}
          </div>
        </div>
      </div>
    </UiShell>
  );
}

function ReviewPayoutMockup() {
  return (
    <UiShell title="Lavo platform">
      <div className="space-y-2">
        <div className="mb-1 flex items-center justify-between rounded-md border border-white/[0.08] bg-white/[0.02] px-2.5 py-1.5">
          <span className="text-[11px] text-ink-400">Coordinated by</span>
          <span className="text-xs font-medium text-gleam">Lavo</span>
        </div>
        <CheckRow label="Resident review collected" />
        <CheckRow label="Wash photos approved" />
        <div className="mt-1 rounded-lg border border-gleam/25 bg-gleam/[0.08] px-2.5 py-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] text-ink-400">Operator payout</p>
              <p className="mt-0.5 text-xs font-medium text-gleam">Released</p>
            </div>
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full border border-gleam/30 bg-gleam/10 text-gleam"
              aria-hidden
            >
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
                <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
        </div>
        <p className="text-[11px] text-ink-400">Lavo sends reminders, handles payment, and closes the job</p>
      </div>
    </UiShell>
  );
}

/* ─── Compact audience mockups ───────────────────────────────────────────── */

function CompactBuildingMockup() {
  return (
    <div className="space-y-2 rounded-lg border border-white/[0.08] bg-ink-950/70 p-2.5 ring-1 ring-inset ring-white/[0.03]">
      <StatusRow label="Building cost" value="$0" highlight large />
      <StatusRow label="Amenity status" value="Live" highlight />
    </div>
  );
}

function CompactResidentMockup() {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-ink-950/70 p-2.5 ring-1 ring-inset ring-white/[0.03]">
      <div className="flex items-center justify-between text-xs">
        <span className="text-ink-400">From phone</span>
        <span className="font-medium text-ink-200">Booked</span>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-ink-400">Payment</span>
        <span className="font-medium text-gleam">Confirmed</span>
      </div>
    </div>
  );
}

function CompactOperatorMockup() {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-ink-950/70 p-2.5 ring-1 ring-inset ring-white/[0.03]">
      <div className="flex items-center justify-between text-xs">
        <span className="text-ink-400">Local operator</span>
        <span className="font-medium text-ink-200">Wash complete</span>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-ink-400">Payout</span>
        <span className="font-medium text-gleam">Released</span>
      </div>
    </div>
  );
}

/* ─── Data ───────────────────────────────────────────────────────────────── */

const WORKFLOW_STEPS = [
  {
    n: '01',
    role: 'Building',
    title: 'Building setup',
    body: 'Your building approves Lavo once, pays $0, and shares a QR code or resident link.',
    mockup: <BuildingSetupMockup />,
    featured: false,
  },
  {
    n: '02',
    role: 'Resident',
    title: 'Resident booking',
    body: 'Residents book a wash package from their phone, pick a time, and pay online.',
    mockup: <ResidentBookingMockup />,
    featured: false,
  },
  {
    n: '03',
    role: 'Local operator',
    title: 'Wash day',
    body: 'A vetted local operator arrives on site, washes the car in your garage, and uploads photos.',
    mockup: <WashDayMockup />,
    featured: true,
  },
  {
    n: '04',
    role: 'Lavo platform',
    title: 'Review & payout',
    body: 'Lavo notifies the resident, collects the review, and releases operator payout.',
    mockup: <ReviewPayoutMockup />,
    featured: false,
  },
] as const;

const AUDIENCE_CARDS = [
  {
    label: 'For buildings',
    headline: 'Buildings pay $0',
    body: 'Launch the amenity without staffing, scheduling, or resident coordination.',
    mockup: <CompactBuildingMockup />,
  },
  {
    label: 'For residents',
    headline: 'Residents pay per wash',
    body: 'Book from their phone, choose a time, pay per wash, and get updates.',
    mockup: <CompactResidentMockup />,
  },
  {
    label: 'For operators',
    headline: 'Operators get paid after the job',
    body: 'Vetted local operators complete the wash, upload photos, and receive payout.',
    mockup: <CompactOperatorMockup />,
  },
] as const;

const ROLES = [
  {
    title: 'For buildings',
    body: 'Add Lavo for free, connect a local mobile wash operator, and share a resident booking link or QR code.',
    href: '/buildings',
    cta: 'Property managers',
    icon: (
      <svg viewBox="0 0 32 32" className="h-8 w-8" fill="none" aria-hidden>
        <rect x="5" y="4" width="22" height="24" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="10" y="10" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.25" />
        <rect x="17" y="10" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.25" />
        <rect x="13" y="20" width="6" height="8" rx="0.5" stroke="currentColor" strokeWidth="1.25" />
      </svg>
    ),
  },
  {
    title: 'For residents',
    body: 'Book from your phone, add your car and parking spot, choose a wash day or open slot, and pay in the app.',
    href: '/signup?role=resident',
    cta: 'Book a wash',
    icon: (
      <svg viewBox="0 0 32 32" className="h-8 w-8" fill="none" aria-hidden>
        <circle cx="16" cy="11" r="5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M6 27c1.5-5 5-8 10-8s8.5 3 10 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: 'For operators',
    body: 'Run wash days in the building garage or lot, follow the handoff process, complete the wash, and get paid after the job.',
    href: '/operators',
    cta: 'Join the network',
    icon: (
      <svg viewBox="0 0 32 32" className="h-8 w-8" fill="none" aria-hidden>
        <path d="M5 12h14l2.5 6h5v8H5V12z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <circle cx="10" cy="26" r="3" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="22" cy="26" r="3" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
] as const;

/* ─── Platform diagram (full variant only) ───────────────────────────────── */

function PlatformDiagram() {
  return (
    <div className="relative">
      <div className="mb-6 flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-gleam">The platform</p>
          <h3 className="mt-1 font-display text-2xl font-semibold text-ink-100 sm:text-3xl">
            Everything connects through Lavo
          </h3>
        </div>
        <p className="max-w-xs text-sm text-ink-300">
          Setup, booking, wash day, and payout — one system for buildings, residents, and operators.
        </p>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-ink-900/90 to-ink-950 p-4 sm:p-8 shadow-card ring-1 ring-inset ring-white/[0.05]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.07) 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
        />
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-48 w-[80%] -translate-x-1/2 rounded-full bg-gleam/10 blur-[80px]"
          aria-hidden
        />

        <div className="relative mb-6 flex flex-wrap items-center justify-center gap-4 sm:gap-8">
          {['Building', 'Resident', 'Operator'].map((label) => (
            <div
              key={label}
              className="rounded-full border border-white/15 bg-ink-900/80 px-5 py-2 text-sm font-medium text-ink-200 backdrop-blur-sm"
            >
              {label}
            </div>
          ))}
        </div>
        <div className="relative mx-auto mb-2 flex justify-center" aria-hidden>
          <svg width="280" height="24" viewBox="0 0 280 24" className="text-gleam/40">
            <path d="M40 2v12M140 2v12M240 2v12M40 14 L140 20 L240 14" stroke="currentColor" strokeWidth="1" fill="none" strokeDasharray="4 4" />
          </svg>
        </div>

        <svg
          viewBox="0 0 720 320"
          className="relative mx-auto w-full max-w-4xl"
          role="img"
          aria-label="Lavo platform diagram connecting setup, booking, wash day, vehicle, parking spot, operator match, review, and payout"
        >
          <defs>
            <linearGradient id="plat-surface" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(25,240,216,0.12)" />
              <stop offset="50%" stopColor="rgba(25,240,216,0.04)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
            </linearGradient>
            <filter id="node-glow">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#19F0D8" floodOpacity="0.35" />
            </filter>
          </defs>

          <g transform="translate(60, 48)">
            <path
              d="M0 24 L600 8 L580 200 L20 216 Z"
              fill="url(#plat-surface)"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="1"
            />
          </g>

          <g stroke="rgba(25,240,216,0.28)" strokeWidth="1" fill="none">
            <line x1="120" y1="72" x2="360" y2="108" />
            <line x1="600" y1="72" x2="360" y2="108" />
            <line x1="360" y1="108" x2="360" y2="168" />
            <line x1="360" y1="108" x2="120" y2="188" />
            <line x1="360" y1="108" x2="560" y2="188" />
            <line x1="120" y1="188" x2="240" y2="200" />
            <line x1="360" y1="168" x2="120" y2="188" />
            <line x1="360" y1="168" x2="560" y2="188" />
            <line x1="360" y1="168" x2="480" y2="248" />
            <line x1="480" y1="248" x2="580" y2="248" />
            <line x1="560" y1="188" x2="580" y2="248" />
          </g>

          <Node x={120} y={72} label="Setup" accent="purple" />
          <Node x={600} y={72} label="QR Link" accent="purple" />
          <Node x={360} y={108} label="Booking" hub />
          <Node x={120} y={188} label="Vehicle" />
          <Node x={240} y={200} label="Parking Spot" />
          <Node x={360} y={168} label="Wash Day" accent="green" />
          <Node x={560} y={188} label="Operator Match" />
          <Node x={480} y={248} label="Review" accent="green" />
          <Node x={580} y={248} label="Payout" accent="green" />

          <text x="640" y="280" fill="rgba(228,232,240,0.5)" fontSize="11" fontFamily="Space Grotesk, sans-serif" fontWeight="600">
            LAVO
          </text>
        </svg>
      </div>
    </div>
  );
}

function Node({
  x,
  y,
  label,
  hub,
  accent,
}: {
  x: number;
  y: number;
  label: string;
  hub?: boolean;
  accent?: 'purple' | 'green';
}) {
  const w = hub ? 100 : label.length > 12 ? 110 : 88;
  const h = 36;
  const stroke =
    hub ? '#19F0D8' : accent === 'purple' ? 'rgba(139,53,201,0.5)' : accent === 'green' ? 'rgba(25,240,216,0.45)' : 'rgba(255,255,255,0.15)';
  const fill = hub ? 'rgba(25,240,216,0.15)' : 'rgba(15,17,21,0.92)';

  return (
    <g transform={`translate(${x - w / 2}, ${y - h / 2})`} filter={hub ? 'url(#node-glow)' : undefined}>
      <rect width={w} height={h} rx="10" fill={fill} stroke={stroke} strokeWidth={hub ? 1.5 : 1} />
      <text
        x={w / 2}
        y={h / 2 + 4}
        textAnchor="middle"
        fill={hub ? '#19F0D8' : '#E4E8F0'}
        fontSize="11"
        fontWeight={hub ? '600' : '500'}
        fontFamily="Space Grotesk, system-ui, sans-serif"
      >
        {label}
      </text>
    </g>
  );
}

function RoleCards() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {ROLES.map((role) => (
        <article
          key={role.title}
          className="card group flex flex-col p-8 transition-colors duration-300 hover:border-gleam/25"
        >
          <div className="mb-5 text-gleam transition-transform duration-300 group-hover:scale-105">{role.icon}</div>
          <h3 className="font-display text-xl font-semibold text-ink-100">{role.title}</h3>
          <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-300">{role.body}</p>
          <Link href={role.href} className="mt-6 text-sm font-medium text-gleam hover:underline">
            {role.cta} →
          </Link>
        </article>
      ))}
    </div>
  );
}

/* ─── Workflow + audience sections ───────────────────────────────────────── */

const ACTOR_SUMMARY = [
  { who: 'Building', what: 'Pays $0', highlight: true },
  { who: 'Resident', what: 'Books & pays on phone', highlight: false },
  { who: 'Local operator', what: 'Washes on site', highlight: false },
  { who: 'Lavo', what: 'Coordinates everything', highlight: true },
] as const;

function ActorSummaryBar() {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent p-4 ring-1 ring-inset ring-white/[0.05] sm:p-5">
      <p className="text-center text-xs font-medium uppercase tracking-[0.14em] text-ink-400">
        Who does what
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {ACTOR_SUMMARY.map((item, i) => (
          <div
            key={item.who}
            className={`relative rounded-xl border px-3 py-3 ${
              item.highlight
                ? 'border-gleam/25 bg-gleam/[0.06]'
                : 'border-white/[0.08] bg-ink-950/50'
            }`}
          >
            {i < ACTOR_SUMMARY.length - 1 && (
              <span
                className="pointer-events-none absolute -right-2 top-1/2 hidden h-px w-4 -translate-y-1/2 bg-gleam/25 lg:block"
                aria-hidden
              />
            )}
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-gleam">{item.who}</p>
            <p className={`mt-1 text-sm font-semibold leading-snug ${item.highlight ? 'text-gleam' : 'text-ink-100'}`}>
              {item.what}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-xs leading-relaxed text-ink-400 sm:text-sm">
        Lavo is the platform — not the wash crew. Vetted local operators do the wash.
      </p>
    </div>
  );
}

function WorkflowSection() {
  return (
    <div className="relative">
      {/* Desktop connector line */}
      <div
        className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-[7.5rem] hidden h-px bg-gradient-to-r from-transparent via-gleam/25 to-transparent lg:block"
        aria-hidden
      />

      <ol className="relative grid grid-cols-1 gap-6 lg:grid-cols-4 lg:gap-5">
        {WORKFLOW_STEPS.map((step, i) => (
          <li key={step.n} className="group relative flex">
            {/* Mobile vertical connector */}
            {i < WORKFLOW_STEPS.length - 1 && (
              <span
                className="absolute left-[1.125rem] top-[3.25rem] bottom-[-1.5rem] w-px bg-gradient-to-b from-gleam/30 to-gleam/10 lg:hidden"
                aria-hidden
              />
            )}

            {/* Desktop arrow between cards */}
            {i < WORKFLOW_STEPS.length - 1 && (
              <span
                className="pointer-events-none absolute -right-3 top-[7.5rem] z-10 hidden text-gleam/35 lg:block"
                aria-hidden
              >
                <svg viewBox="0 0 24 12" className="h-3 w-6" fill="none">
                  <path d="M0 6h18M14 2l4 4-4 4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            )}

            <article
              className={`card relative flex w-full flex-col overflow-hidden p-0 ring-1 ring-inset transition-colors duration-300 hover:border-gleam/20 ${
                step.featured
                  ? 'border-gleam/25 from-gleam/[0.08] to-transparent shadow-glow ring-gleam/15 lg:-mt-1 lg:pb-1'
                  : 'ring-white/[0.05]'
              } ${step.featured ? 'bg-gradient-to-b' : ''}`}
            >
              {step.featured && (
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-gleam/10 to-transparent"
                  aria-hidden
                />
              )}

              <div className="relative px-4 pb-3 pt-5 sm:px-5">
                <div className="flex items-start gap-3">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border font-mono text-[11px] font-medium tracking-wider ${
                      step.featured
                        ? 'border-gleam/40 bg-gleam/15 text-gleam'
                        : 'border-white/10 bg-white/[0.03] text-gleam'
                    }`}
                  >
                    {step.n}
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-gleam">{step.role}</p>
                    <h3 className="mt-1 font-display text-lg font-semibold leading-tight text-ink-100">{step.title}</h3>
                  </div>
                </div>
              </div>

              <div className={`relative px-4 sm:px-5 ${step.featured ? 'pb-5' : 'pb-4'}`}>{step.mockup}</div>

              <p className="mt-auto px-4 pb-5 text-sm leading-relaxed text-ink-200 sm:px-5">{step.body}</p>
            </article>
          </li>
        ))}
      </ol>
    </div>
  );
}

function AudienceStrip() {
  return (
    <div>
      <h3 className="text-center font-display text-xl font-semibold text-ink-100 sm:text-2xl">
        Simple for every side
      </h3>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {AUDIENCE_CARDS.map((card) => (
          <article
            key={card.label}
            className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.03] to-transparent p-4 ring-1 ring-inset ring-white/[0.04]"
          >
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-gleam">{card.label}</p>
            <h4 className="mt-2 font-display text-base font-semibold text-ink-100">{card.headline}</h4>
            <div className="mt-3">{card.mockup}</div>
            <p className="mt-3 text-sm leading-relaxed text-ink-300">{card.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function SectionCtas() {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.03] to-transparent px-6 py-6 text-center ring-1 ring-inset ring-white/[0.04] sm:px-8">
      <p className="font-display text-lg font-semibold text-ink-100 sm:text-xl">
        Add a car wash amenity to your building
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-300">
        Buildings pay $0. Lavo coordinates booking, scheduling, and payouts — your team just approves once.
      </p>
      <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
        <Link href="#request-lavo" className="btn-primary w-full px-6 py-2.5 text-sm sm:w-auto">
          Request Lavo for your building
        </Link>
        <Link href="/how-it-works" className="btn-ghost w-full px-6 py-2.5 text-sm sm:w-auto">
          See how it works
        </Link>
      </div>
      <p className="mt-3 text-xs text-ink-500">Enter your building address · No cost to the property</p>
    </div>
  );
}

/* ─── Exports ────────────────────────────────────────────────────────────── */

type Props = { className?: string; variant?: 'full' | 'preview' };

export function HowLavoWorksVisual({ className = '', variant = 'full' }: Props) {
  const isPreview = variant === 'preview';

  return (
    <div className={`space-y-12 sm:space-y-14 ${className}`.trim()}>
      {!isPreview && <RoleCards />}
      {!isPreview && <PlatformDiagram />}
      <ActorSummaryBar />
      <WorkflowSection />
      <AudienceStrip />
      {isPreview && <SectionCtas />}
    </div>
  );
}

/** @deprecated */
export function HowLavoWorksInfographic(props: { className?: string; showSidebar?: boolean }) {
  return <HowLavoWorksVisual className={props.className} variant={props.showSidebar === false ? 'preview' : 'full'} />;
}

export function HowLavoWorksPreview({ className = '' }: { className?: string }) {
  return (
    <div className={className}>
      <HowLavoWorksVisual variant="preview" />
    </div>
  );
}
