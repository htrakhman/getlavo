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
        <img
          src="/lavo-mark.png"
          alt=""
          aria-hidden
          className="h-full w-full object-contain"
        />
      </span>

      <span className="text-ink-100">LAVO</span>
    </Link>
  );
}
