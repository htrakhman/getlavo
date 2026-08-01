import Link from 'next/link';
import { AlertDot } from '@/components/PortalShell';

// The Contract page lives under the "My operator" nav item — these tabs let
// managers move between the operator relationship and its agreement.
const TABS = [
  { href: '/building/marketplace', label: 'Operator' },
  { href: '/building/contract', label: 'Contract' },
];

// contractPending mirrors the same "agreement is waiting on the manager's
// signature" condition that flags "My operator" with a red dot in the
// sidebar (see building/layout.tsx) — keeping the dot on the page in sync
// with the one in the nav.
export function OperatorTabs({ active, contractPending }: { active: string; contractPending?: boolean }) {
  return (
    <div className="mb-6 flex gap-2">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`flex items-center rounded-lg px-3 py-1.5 text-sm transition ${
            active === t.href
              ? 'bg-white/10 text-ink-100'
              : 'text-ink-400 hover:bg-white/5 hover:text-ink-100'
          }`}
        >
          {t.label}
          {contractPending && t.href === '/building/contract' && <AlertDot />}
        </Link>
      ))}
    </div>
  );
}
