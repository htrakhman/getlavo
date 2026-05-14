'use client';
import Link from 'next/link';
import { Logo } from './Logo';
import { useEffect, useRef, useState } from 'react';

const ROLES = [
  { label: 'Property Manager', href_signin: '/login?prefer=building' },
  { label: 'Car Wash Operator', href_signin: '/login?prefer=operator' },
  { label: 'Resident', href_signin: '/login?prefer=resident' },
];

function NavDropdown({ trigger, children }: { trigger: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-white/10 bg-ink-900 shadow-xl ring-1 ring-inset ring-white/5">
          {children}
        </div>
      )}
    </div>
  );
}

export function MarketingNav() {
  return (
    <header className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
      <Logo />
      <nav className="hidden items-center gap-8 text-sm text-ink-300 md:flex">
        <Link href="/help" className="hover:text-ink-100">Help</Link>
        <Link href="/how-it-works" className="hover:text-ink-100">How it works</Link>
        <Link href="/operators" className="hover:text-ink-100">For operators</Link>
        <Link href="/buildings" className="hover:text-ink-100">For properties</Link>
      </nav>
      <div className="flex items-center gap-2">
        <NavDropdown
          trigger={
            <button className="btn-quiet flex items-center gap-1.5">
              Sign in
              <ChevronDown />
            </button>
          }
        >
          <div className="px-3 py-2 text-[10px] uppercase tracking-widest text-ink-500">Sign in as</div>
          {ROLES.map((r) => (
            <Link
              key={r.label}
              href={r.href_signin}
              className="block px-4 py-2.5 text-sm text-ink-200 hover:bg-white/5 hover:text-ink-100"
            >
              {r.label}
            </Link>
          ))}
        </NavDropdown>
      </div>
    </header>
  );
}

function ChevronDown() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/5 px-6 py-10 text-sm text-ink-400">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <Logo size="sm" />
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs md:text-sm">
          <Link href="/how-it-works" className="hover:text-ink-100">How it works</Link>
          <Link href="/help" className="hover:text-ink-100">Help</Link>
          <Link href="/operators" className="hover:text-ink-100">Operators</Link>
          <Link href="/buildings" className="hover:text-ink-100">Properties</Link>
          <Link href="/legal/terms" className="hover:text-ink-100">Terms</Link>
          <Link href="/legal/privacy" className="hover:text-ink-100">Privacy</Link>
          <Link href="/legal/damage-policy" className="hover:text-ink-100">Damage</Link>
          <Link href="/contact" className="hover:text-ink-100">Contact</Link>
          <Link href="/status" className="hover:text-ink-100">Status</Link>
          <Link href="/careers" className="hover:text-ink-100">Careers</Link>
          <Link href="/press" className="hover:text-ink-100">Press</Link>
        </div>
      </div>
      <div className="mx-auto mt-8 max-w-7xl text-center text-xs text-ink-500">© {new Date().getFullYear()} Lavo, Inc.</div>
    </footer>
  );
}
