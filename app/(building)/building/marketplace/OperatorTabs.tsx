import Link from 'next/link';

// The Contract page lives under the "My operator" nav item — these tabs let
// managers move between the operator relationship and its agreement.
const TABS = [
  { href: '/building/marketplace', label: 'Operator' },
  { href: '/building/contract', label: 'Contract' },
];

export function OperatorTabs({ active }: { active: string }) {
  return (
    <div className="mb-6 flex gap-2">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`rounded-lg px-3 py-1.5 text-sm transition ${
            active === t.href
              ? 'bg-white/10 text-ink-100'
              : 'text-ink-400 hover:bg-white/5 hover:text-ink-100'
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
