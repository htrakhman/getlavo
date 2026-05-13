import Link from 'next/link';

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const textCls =
    size === 'lg' ? 'text-3xl' : size === 'sm' ? 'text-base' : 'text-xl';
  const iconH =
    size === 'lg' ? '2.1em' : size === 'sm' ? '1.4em' : '1.75em';

  return (
    <Link
      href="/"
      className={`group inline-flex items-center gap-2.5 font-display font-bold tracking-wide ${textCls}`}
    >
      <span className="relative inline-flex shrink-0 items-center justify-center" style={{ height: iconH, width: iconH }}>
        <svg viewBox="0 0 84 110" className="h-full w-full" aria-hidden fill="none">
          <defs>
            <linearGradient
              id="lavo-grad"
              x1="0" y1="0" x2="84" y2="110"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%"   stopColor="#D93EA0" />
              <stop offset="48%"  stopColor="#8B35C9" />
              <stop offset="100%" stopColor="#2B7CE8" />
            </linearGradient>
          </defs>

          {/* Outer ribbon — traces the full teardrop boundary */}
          <path
            d="M 28 16
               C 8 22, 3 46, 3 65
               C 3 84, 20 102, 42 106
               C 64 102, 81 84, 81 65
               C 81 46, 76 22, 56 16"
            stroke="url(#lavo-grad)"
            strokeWidth="13"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Inner ribbon — smaller loop creating the folded-ribbon depth */}
          <path
            d="M 28 16
               C 24 30, 22 46, 22 63
               C 22 79, 30 92, 42 96
               C 54 92, 62 79, 62 63
               C 62 46, 60 30, 56 16"
            stroke="url(#lavo-grad)"
            strokeWidth="11"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Magenta accent dot */}
          <circle cx="61" cy="9" r="7.5" fill="#D93EA0" />
          {/* Cyan accent dot */}
          <circle cx="74" cy="23" r="5.5" fill="#5BCEF0" />
        </svg>
      </span>

      <span className="text-white">LAVO</span>
    </Link>
  );
}
