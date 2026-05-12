import { PortalShell } from '@/components/PortalShell';
import { getSessionUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

const NAV = [
  { href: '/operator', label: 'Overview' },
  { href: '/operator/buildings', label: 'Buildings' },
  { href: '/operator/wash-days', label: 'Wash days' },
  { href: '/operator/earnings', label: 'Earnings' },
  { href: '/operator/reviews', label: 'Reviews' },
  { href: '/operator/profile', label: 'Profile' },
];

export default async function OperatorLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  if (!session.portals.includes('operator')) redirect('/');
  return (
    <PortalShell nav={NAV} accent="Operator portal" user={{ name: session.profile.full_name, sub: session.profile.email, role: session.profile.role }}>
      {children}
    </PortalShell>
  );
}
