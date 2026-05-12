import { PortalShell } from '@/components/PortalShell';
import { getSessionUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

const NAV = [
  { href: '/resident/washes', label: 'My washes' },
  { href: '/resident/vehicle', label: 'Vehicle' },
  { href: '/resident/addons', label: 'Add-ons' },
  { href: '/resident/announcements', label: 'Announcements' },
  { href: '/resident/payment', label: 'Payment' },
  { href: '/resident/charges', label: 'Charges' },
  { href: '/resident/account', label: 'Account' },
];

export default async function ResidentLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  if (!session.portals.includes('resident')) redirect('/');
  return (
    <PortalShell nav={NAV} accent="Resident portal" user={{ name: session.profile.full_name, sub: session.profile.email, role: session.profile.role }} currentPortal="resident" portals={session.portals}>
      {children}
    </PortalShell>
  );
}
