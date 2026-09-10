import { PortalShell } from '@/components/PortalShell';
import { getSessionUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getCurrentBuildingForSession } from '@/lib/building';
import { getPendingAgreementsForManager } from '@/lib/pending-agreements';
import { BuildingSwitcher } from './BuildingSwitcher';

const NAV = [
  { href: '/building', label: 'Overview' },
  { href: '/building/marketplace', label: 'My operator' },
  { href: '/building/residents', label: 'Residents' },
  { href: '/building/wash-days', label: 'Wash days' },
  { href: '/building/announcements', label: 'Announcements' },
  { href: '/building/issues', label: 'Issues' },
  { href: '/building/settings', label: 'Settings' },
];

export default async function BuildingLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  if (!session.portals.includes('building')) {
    const home = session.portals.includes('operator') ? '/operator'
               : session.portals.includes('resident') ? '/resident'
               : '/login';
    redirect(home);
  }

  const [{ current, all }, pending] = await Promise.all([
    getCurrentBuildingForSession(session.user.id),
    getPendingAgreementsForManager(session.user.id),
  ]);

  // Red-dot guidance: flag "My operator" (which hosts the Contract tab) when
  // an agreement is waiting on the manager's signature. This counts EVERY
  // building the manager owns, not just the selected one — scoped to the
  // current building, the dot vanished the moment they switched away from the
  // building with the offer, which is how offers on the other buildings went
  // unnoticed entirely.
  const alerts: string[] = pending.length ? ['/building/marketplace'] : [];
  const pendingBuildingIds = pending.map((p) => p.buildingId);

  return (
    <PortalShell
      nav={NAV}
      accent="Building portal"
      alerts={alerts}
      user={{ name: session.profile.full_name, sub: session.profile.email, role: session.profile.role }}
      sidebarTop={<BuildingSwitcher current={current} all={all} pendingBuildingIds={pendingBuildingIds} />}
      currentPortal="building"
      portals={session.portals}
    >
      {children}
    </PortalShell>
  );
}
