import { PortalShell } from '@/components/PortalShell';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getCurrentBuildingForSession } from '@/lib/building';
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

  const { current, all } = await getCurrentBuildingForSession(session.user.id);

  // Red-dot guidance: flag "My operator" (which hosts the Contract tab) when
  // an agreement is waiting on the manager's signature.
  const alerts: string[] = [];
  if (current) {
    const sb = supabaseServer();
    const { data: pendingContract } = await sb
      .from('contracts')
      .select('id')
      .eq('building_id', current.id)
      .eq('status', 'pending_signatures')
      .is('manager_signed_at', null)
      .limit(1)
      .maybeSingle();
    if (pendingContract) alerts.push('/building/marketplace');
  }

  return (
    <PortalShell
      nav={NAV}
      accent="Building portal"
      alerts={alerts}
      user={{ name: session.profile.full_name, sub: session.profile.email, role: session.profile.role }}
      sidebarTop={<BuildingSwitcher current={current} all={all} />}
      currentPortal="building"
      portals={session.portals}
    >
      {children}
    </PortalShell>
  );
}
