import Link from 'next/link';

/* ─── Data ───────────────────────────────────────────────────────────────── */

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

const STEPS = [
  {
    n: '01',
    title: 'Setup',
    body: 'Building launches Lavo and shares QR.',
    illustration: (
      <svg viewBox="0 0 200 120" className="h-full w-full" fill="none" aria-hidden>
        <rect x="20" y="35" width="48" height="70" rx="3" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
        <rect x="30" y="48" width="12" height="12" rx="1" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        <rect x="88" y="18" width="56" height="88" rx="8" stroke="#19F0D8" strokeWidth="1.5" opacity="0.7" />
        <rect x="100" y="36" width="32" height="32" rx="4" stroke="#19F0D8" strokeWidth="1.25" />
        <rect x="106" y="42" width="8" height="8" fill="#19F0D8" opacity="0.5" />
        <rect x="118" y="42" width="8" height="8" fill="#19F0D8" opacity="0.5" />
        <rect x="106" y="54" width="8" height="8" fill="#19F0D8" opacity="0.5" />
        <rect x="118" y="54" width="8" height="8" fill="#19F0D8" opacity="0.5" />
      </svg>
    ),
  },
  {
    n: '02',
    title: 'Book',
    body: 'Resident books and pays in app.',
    illustration: (
      <svg viewBox="0 0 200 120" className="h-full w-full" fill="none" aria-hidden>
        <rect x="62" y="14" width="56" height="92" rx="10" stroke="#19F0D8" strokeWidth="1.5" opacity="0.75" />
        <rect x="72" y="28" width="36" height="28" rx="3" stroke="rgba(255,255,255,0.2)" strokeWidth="1.25" />
        <path d="M76 36h16M76 44h24" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeLinecap="round" />
        <rect x="128" y="44" width="44" height="28" rx="4" stroke="#19F0D8" strokeWidth="1.25" />
        <path d="M136 58h28" stroke="rgba(228,232,240,0.5)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    n: '03',
    title: 'Wash day',
    body: 'Car is moved, washed, photographed, and returned.',
    illustration: (
      <svg viewBox="0 0 200 120" className="h-full w-full" fill="none" aria-hidden>
        <path d="M16 88h120" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        <path d="M40 88h56l10-22H50l-10 22z" stroke="rgba(228,232,240,0.45)" strokeWidth="1.5" strokeLinejoin="round" />
        <circle cx="48" cy="88" r="5" stroke="rgba(255,255,255,0.25)" strokeWidth="1.25" />
        <circle cx="88" cy="88" r="5" stroke="rgba(255,255,255,0.25)" strokeWidth="1.25" />
        <path d="M108 42c6-14 20-14 28 0" stroke="#19F0D8" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="148" cy="58" r="10" stroke="rgba(255,255,255,0.2)" strokeWidth="1.25" />
      </svg>
    ),
  },
  {
    n: '04',
    title: 'Done',
    body: 'Resident reviews, operator gets paid.',
    illustration: (
      <svg viewBox="0 0 200 120" className="h-full w-full" fill="none" aria-hidden>
        <rect x="48" y="14" width="56" height="92" rx="10" stroke="#19F0D8" strokeWidth="1.5" opacity="0.75" />
        <path d="M64 58l8 8 16-20" stroke="#19F0D8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M68 44l3 5 6-9" stroke="#19F0D8" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
        <circle cx="148" cy="60" r="22" stroke="#19F0D8" strokeWidth="1.25" opacity="0.45" />
        <path d="M148 50v20M138 60h20" stroke="#19F0D8" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
] as const;

const PRICING = [
  { label: 'Buildings pay', value: '$0', icon: '$' },
  { label: 'Residents pay', value: 'Per wash', icon: '·' },
  { label: 'Operators paid', value: 'After job', icon: '→' },
] as const;

/* ─── Platform diagram (single SVG, no overlapping HTML chips) ─────────── */

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
        <p className="max-w-xs text-sm text-ink-400">
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

        {/* Audience funnel */}
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
            <filter id="gleam-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="node-glow">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#19F0D8" floodOpacity="0.35" />
            </filter>
          </defs>

          {/* Perspective platform surface */}
          <g transform="translate(60, 48)">
            <path
              d="M0 24 L600 8 L580 200 L20 216 Z"
              fill="url(#plat-surface)"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="1"
            />
          </g>

          {/* Connection lines */}
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

          {/* Nodes */}
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

/* ─── Process timeline ───────────────────────────────────────────────────── */

function ProcessTimeline() {
  return (
    <div>
      <div className="mb-8 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-gleam">The flow</p>
        <h3 className="mt-2 font-display text-2xl font-semibold text-ink-100 sm:text-3xl">
          Four steps start to finish
        </h3>
      </div>

      <div className="relative">
        <div
          className="absolute left-0 right-0 top-[4.5rem] hidden h-px bg-gradient-to-r from-transparent via-gleam/30 to-transparent lg:block"
          aria-hidden
        />

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
          {STEPS.map((step, i) => (
            <div key={step.n} className="group relative flex flex-col">
              {i < STEPS.length - 1 && (
                <div
                  className="absolute -right-3 top-16 z-10 hidden h-px w-6 bg-gleam/25 lg:block"
                  aria-hidden
                />
              )}
              <div className="card flex flex-1 flex-col overflow-hidden p-0 ring-1 ring-inset ring-white/[0.05] transition-colors duration-300 hover:border-gleam/20">
                <div className="relative flex h-32 items-center justify-center bg-gradient-to-b from-gleam/[0.06] to-transparent px-4 pt-6">
                  <div className="h-24 w-full max-w-[160px] opacity-90 transition-opacity group-hover:opacity-100">
                    {step.illustration}
                  </div>
                </div>
                <div className="flex flex-1 flex-col px-5 pb-6 pt-4">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-medium tracking-wider text-gleam">{step.n}</span>
                    <span className="font-display text-lg font-semibold text-ink-100">{step.title}</span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-ink-400">{step.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PricingBar() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {PRICING.map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-transparent px-6 py-5 ring-1 ring-inset ring-white/[0.04]"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gleam/25 bg-gleam/10 font-display text-lg text-gleam">
            {item.icon}
          </span>
          <div>
            <p className="text-xs uppercase tracking-wider text-ink-500">{item.label}</p>
            <p className="font-display text-xl font-semibold text-ink-100">{item.value}</p>
          </div>
        </div>
      ))}
    </div>
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

/* ─── Exports ────────────────────────────────────────────────────────────── */

type Props = { className?: string; variant?: 'full' | 'preview' };

/** Polished, site-native How Lavo Works — sections, not a cramped infographic card. */
export function HowLavoWorksVisual({ className = '', variant = 'full' }: Props) {
  const isPreview = variant === 'preview';

  return (
    <div className={`space-y-16 sm:space-y-20 ${className}`.trim()}>
      {!isPreview && <RoleCards />}
      {!isPreview && <PlatformDiagram />}
      <ProcessTimeline />
      <PricingBar />
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
      <p className="mt-10 text-center">
        <Link href="/how-it-works" className="text-sm font-medium text-gleam hover:underline">
          See the full platform diagram →
        </Link>
      </p>
    </div>
  );
}
