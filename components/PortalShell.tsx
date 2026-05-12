import Link from 'next/link';
import { Logo } from './Logo';
import { DevRoleSwitcher } from './DevRoleSwitcher';
import { NotificationsBell } from './NotificationsBell';
import { MobileMenu } from './MobileMenu';

export type NavItem = { href: string; label: string; icon?: React.ReactNode };

export function PortalShell({
  nav, user, accent, children, sidebarTop, currentPortal, portals,
}: { nav: NavItem[]; user: { name: string; sub: string; role: string }; accent: string; children: React.ReactNode; sidebarTop?: React.ReactNode; currentPortal?: string; portals?: string[] }) {
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-white/5 bg-ink-900/60 px-4 py-6 backdrop-blur md:flex md:flex-col">
        <Logo />
        <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-gleam">{accent}</div>
        {sidebarTop && <div className="mt-6">{sidebarTop}</div>}
        <nav className="mt-6 flex flex-col gap-1">
          {nav.map((n) => (
            <Link key={n.href} href={n.href}
              className="rounded-lg px-3 py-2 text-sm text-ink-300 transition hover:bg-white/5 hover:text-ink-100">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-3">
          {portals && portals.length > 1 && currentPortal && (
            <DevRoleSwitcher currentPortal={currentPortal} />
          )}
          <div className="rounded-xl border border-white/5 bg-white/5 p-3">
            <div className="text-sm font-medium text-ink-100">{user.name}</div>
            <div className="truncate text-xs text-ink-400">{user.sub}</div>
            <form action="/api/auth/signout" method="post">
              <button className="mt-3 text-xs text-ink-400 hover:text-ink-100">Sign out</button>
            </form>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        <header className="flex items-center justify-between gap-2 border-b border-white/5 px-4 py-3 md:px-10">
          <MobileMenu nav={nav} accent={accent} user={user} />
          <div className="ml-auto flex items-center gap-3">
            <NotificationsBell />
            <div className="hidden md:flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs font-medium text-ink-100">{user.name}</div>
                <div className="text-[11px] text-ink-400 truncate max-w-[160px]">{user.sub}</div>
              </div>
              <form action="/api/auth/signout" method="post">
                <button className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-ink-300 transition hover:bg-white/10 hover:text-ink-100">
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </header>
        <div className="px-6 py-8 md:px-10">{children}</div>
      </main>
    </div>
  );
}

export function PageHeader({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-8 flex items-end justify-between gap-6">
      <div>
        {eyebrow && <div className="text-xs uppercase tracking-[0.18em] text-gleam">{eyebrow}</div>}
        <h1 className="mt-1 font-display text-4xl tracking-tight">{title}</h1>
      </div>
      <div>{action}</div>
    </div>
  );
}
