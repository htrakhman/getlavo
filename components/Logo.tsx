import Link from 'next/link';

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const cls = size === 'lg' ? 'text-3xl' : size === 'sm' ? 'text-base' : 'text-xl';
  return (
    <Link href="/" className={`group inline-flex items-center gap-2 font-display font-semibold tracking-tight ${cls}`}>
      <span className="relative inline-flex h-[1.1em] w-[1.1em] items-center justify-center">
        <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden>
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#19F0D8" />
              <stop offset="100%" stopColor="#0AA396" />
            </linearGradient>
          </defs>
          <path d="M12 2 L14 9 L21 11 L14 13 L12 22 L10 13 L3 11 L10 9 Z" fill="url(#g)" />
        </svg>
      </span>
      <span className="text-ink-100">
        La<span className="text-gleam">vo</span>
      </span>
    </Link>
  );
}
