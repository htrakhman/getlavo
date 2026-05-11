'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { NavItem } from './PortalShell';

export function MobileMenu({ nav, accent, user }: { nav: NavItem[]; accent: string; user: { name: string; sub: string } }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="rounded-lg p-2 text-ink-300 hover:bg-white/5 hover:text-ink-100"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/70" onClick={() => setOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white/5 bg-ink-900 px-4 py-6">
            <div className="flex items-center justify-between">
              <span className="font-display text-lg">Lavo</span>
              <button onClick={() => setOpen(false)} className="text-ink-400 hover:text-ink-100">✕</button>
            </div>
            <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-gleam">{accent}</div>
            <nav className="mt-8 flex flex-col gap-1">
              {nav.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm text-ink-300 transition hover:bg-white/5 hover:text-ink-100"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
            <div className="mt-auto rounded-xl border border-white/5 bg-white/5 p-3">
              <div className="text-sm font-medium text-ink-100">{user.name}</div>
              <div className="truncate text-xs text-ink-400">{user.sub}</div>
              <form action="/api/auth/signout" method="post">
                <button className="mt-3 text-xs text-ink-400 hover:text-ink-100">Sign out</button>
              </form>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
