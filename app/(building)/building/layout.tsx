import { PortalShell } from '@/components/PortalShell';
import { getSessionUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getCurrentBuildingForSession } from '@/lib/building';
import { getPendingAgreementsForManager } from '@/lib/pending-agreements';
import { getBuildingAttention, attentionNavHrefs } from '@/lib/building-attention';
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
  const attention = await getBuildingAttention(session.user.id, current?.id ?? null);

  // Red-dot guidance now comes from lib/building-attention.ts, which is also
  // what the Overview checklist and the page-level panels render. One dot per
  // nav entry that actually has an outstanding item beneath it, so a dot is
  // always answerable: follow it and the page names the thing.
  //
  // Signature items still count EVERY building the manager owns, not just the
  // selected one — scoped to the current building, the dot vanished the moment
  // they switched away from the building with the offer.
  const alerts: string[] = attentionNavHrefs(attention);
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
