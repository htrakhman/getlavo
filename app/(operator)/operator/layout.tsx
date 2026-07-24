import { PortalShell } from '@/components/PortalShell';
import { getSessionUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// Grouped into three logical sections. "Overview" was dropped as a separate
// item — it overlapped with "Today"; the overview dashboard still lives at
// /operator and is reachable from Today.
const NAV = [
  { heading: 'Account' },
  { href: '/operator/profile', label: 'Profile' },
  { href: '/operator/compliance', label: 'Compliance' },
  { heading: 'Business' },
  { href: '/operator/earnings', label: 'Earnings' },
  { href: '/operator/reviews', label: 'Reviews' },
  { href: '/operator/contracts', label: 'Contracts' },
  { heading: 'Operations' },
  { href: '/operator/today', label: 'Today' },
  { href: '/operator/buildings', label: 'Buildings' },
  { href: '/operator/wash-days', label: 'Wash days' },
];

export default async function OperatorLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  if (!session.portals.includes('operator')) {
    const home = session.portals.includes('building') ? '/building'
               : session.portals.includes('resident') ? '/resident'
               : '/login';
    redirect(home);
  }
  return (
    <PortalShell nav={NAV} accent="Operator portal" user={{ name: session.profile.full_name, sub: session.profile.email, role: session.profile.role }} currentPortal="operator" portals={session.portals}>
      {children}
    </PortalShell>
  );
}
