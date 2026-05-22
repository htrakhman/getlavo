import type { ReactNode } from 'react';
import Link from 'next/link';

const TIMELINE_STEPS = [
  {
    label: 'Parked in spot',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="3" y="11" width="18" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.25" />
        <path d="M7 11V8a5 5 0 0110 0v3" stroke="currentColor" strokeWidth="1.25" />
        <circle cx="8" cy="18" r="1.25" fill="currentColor" />
        <circle cx="16" cy="18" r="1.25" fill="currentColor" />
      </svg>
    ),
  },
  {
    label: 'Key or concierge handoff',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="8" cy="14" r="4" stroke="currentColor" strokeWidth="1.25" />
        <path d="M12 14h8M16 10v8" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: 'Approved wash area',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4 20V8l8-4 8 4v12" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
        <path d="M9 20v-6h6v6" stroke="currentColor" strokeWidth="1.25" />
      </svg>
    ),
  },
  {
    label: 'Wash and photos',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="4" y="6" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.25" />
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.25" />
      </svg>
    ),
  },
  {
    label: 'Returned to spot',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
] as const;

const TRUST_BADGES = [
  { label: 'Property-approved process', href: null },
  { label: 'Operator follows building rules', href: '/safety' },
  { label: 'Before and after photos', href: null },
  { label: 'Damage policy in place', href: '/legal/damage-policy' },
] as const;

function TimelineNode({
  label,
  icon,
  isLast,
}: {
  label: string;
  icon: ReactNode;
  isLast?: boolean;
}) {
  return (
    <li className="relative flex gap-4 md:flex-1 md:flex-col md:items-center md:text-center">
      {/* Vertical line (mobile) */}
      {!isLast && (
        <span
          className="absolute left-[19px] top-10 bottom-0 w-px bg-gradient-to-b from-gleam/40 to-[#2B7CE8]/20 md:hidden"
          aria-hidden
        />
      )}
      <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gleam/30 bg-gleam/10 text-gleam">
        {icon}
      </div>
      <div className="pb-8 md:pb-0 md:pt-4">
        <p className="text-sm font-medium text-ink-100">{label}</p>
      </div>
    </li>
  );
}

export function TrustTimeline() {
  return (
    <section
      id="trust"
      className="scroll-mt-24 border-y border-white/10 bg-ink-900/40 py-20"
    >
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="font-display text-center text-3xl font-semibold tracking-tight md:text-4xl">
          What actually happens to the car?
        </h2>

        <div className="mt-14 rounded-2xl border border-white/15 bg-ink-900/90 p-6 shadow-card backdrop-blur-xl ring-1 ring-inset ring-white/[0.06] md:p-10">
          {/* Desktop horizontal timeline */}
          <ol className="hidden md:flex md:items-start md:justify-between md:gap-2">
            {TIMELINE_STEPS.map((step, i) => (
              <li key={step.label} className="relative flex flex-1 flex-col items-center text-center">
                {i < TIMELINE_STEPS.length - 1 && (
                  <span
                    className="absolute left-[calc(50%+24px)] right-[calc(-50%+24px)] top-5 h-px bg-gradient-to-r from-gleam/40 via-[#2B7CE8]/30 to-gleam/40"
                    aria-hidden
                  />
                )}
                <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-gleam/30 bg-gleam/10 text-gleam">
                  {step.icon}
                </div>
                <p className="mt-4 max-w-[9rem] text-sm font-medium leading-snug text-ink-100">
                  {step.label}
                </p>
              </li>
            ))}
          </ol>

          {/* Mobile vertical timeline */}
          <ol className="md:hidden">
            {TIMELINE_STEPS.map((step, i) => (
              <TimelineNode
                key={step.label}
                label={step.label}
                icon={step.icon}
                isLast={i === TIMELINE_STEPS.length - 1}
              />
            ))}
          </ol>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST_BADGES.map((badge) => {
            const inner = (
              <span className="flex items-center gap-2 text-sm font-medium text-ink-200">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gleam/70" aria-hidden />
                {badge.label}
              </span>
            );
            if (badge.href) {
              return (
                <Link
                  key={badge.label}
                  href={badge.href}
                  className="card p-4 transition-colors hover:border-white/15"
                >
                  {inner}
                </Link>
              );
            }
            return (
              <div key={badge.label} className="card p-4">
                {inner}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
