import { PortalShell } from '@/components/PortalShell';
import { getSessionUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

const NAV = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/search', label: 'Search' },
  { href: '/admin/buildings', label: 'Buildings' },
  { href: '/admin/operators', label: 'Operators' },
  { href: '/admin/insurance', label: 'Insurance' },
  { href: '/admin/wash-days', label: 'Wash days' },
  { href: '/admin/flags', label: 'Flagged washes' },
  { href: '/admin/payments', label: 'Payments' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/audit', label: 'Audit log' },
  { href: '/admin/health', label: 'System health' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  if (session.profile.role !== 'admin') redirect('/login');
  return (
    <PortalShell nav={NAV} accent="Admin" user={{ name: session.profile.full_name, sub: session.profile.email, role: session.profile.role }}>
      {children}
    </PortalShell>
  );
}
