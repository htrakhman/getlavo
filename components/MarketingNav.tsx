'use client';
import Link from 'next/link';
import { FOOTER_COLUMNS } from '@/lib/seo/internal-links';
import { Logo } from './Logo';
import { useEffect, useRef, useState } from 'react';

const ROLES = [
  { label: 'Property Manager', href_signin: '/login?prefer=building' },
  { label: 'Car Wash Operator', href_signin: '/login?prefer=operator' },
  { label: 'Resident', href_signin: '/login?prefer=resident' },
];

const PRIMARY_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/cities', label: 'Check your building' },
  { href: '/contact', label: 'Contact' },
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
        <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-white/10 bg-ink-900 shadow-card ring-1 ring-inset ring-white/5">
          {children}
        </div>
      )}
    </div>
  );
}

function MobileMarketingMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? 'Close menu' : 'Open menu'}
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-ink-200"
      >
        {open ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden>
            <path d="M2 2l12 12M14 2L2 14" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden>
            <path d="M2 4.5h14M2 9h14M2 13.5h14" />
          </svg>
        )}
      </button>
      {open && (
        <div className="fixed inset-x-0 top-[84px] bottom-0 z-50 overflow-y-auto border-t border-white/10 bg-ink-950 px-6 py-6">
          <nav className="flex flex-col gap-1 text-base">
            {PRIMARY_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-ink-200 hover:bg-white/5 hover:text-ink-100"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="mt-6 border-t border-white/10 pt-6">
            <Link href="/signup" onClick={() => setOpen(false)} className="btn-primary w-full py-3">
              Sign up
            </Link>
            <div className="mt-4 text-xs uppercase tracking-widest text-ink-500">Sign in as</div>
            <div className="mt-1 flex flex-col">
              {ROLES.map((r) => (
                <Link
                  key={r.label}
                  href={r.href_signin}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm text-ink-200 hover:bg-white/5 hover:text-ink-100"
                >
                  {r.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function MarketingNav() {
  return (
    <header className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
      <Logo />
      <nav className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-6 text-sm text-ink-300 lg:gap-8 md:flex">
        {PRIMARY_LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="hover:text-ink-100">
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-2">
        <div className="hidden md:block">
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
        <Link href="/signup" className="btn-primary hidden md:inline-flex">
          Sign up
        </Link>
        <MobileMarketingMenu />
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
      <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[minmax(0,12rem)_1fr] md:items-start">
        <Logo size="sm" />
        <div className="grid gap-8 sm:grid-cols-3">
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <h2 className="text-xs font-medium uppercase tracking-widest text-ink-500">
                {column.title}
              </h2>
              <ul className="mt-3 space-y-2 text-xs md:text-sm">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="hover:text-ink-100">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="mx-auto mt-8 max-w-7xl text-center text-xs text-ink-500">
        © {new Date().getFullYear()} Lavo, Inc.
      </div>
    </footer>
  );
}
