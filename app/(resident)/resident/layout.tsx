import { PortalShell } from '@/components/PortalShell';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { normalizeSize } from '@/lib/vehicle-sizes';

const NAV = [
  { href: '/resident/washes', label: 'My account' },
  { href: '/resident/book', label: 'Book a wash' },
  { href: '/resident/bookings', label: 'My bookings' },
  { href: '/resident/vehicle', label: 'Vehicle' },
  { href: '/resident/payment', label: 'Payment' },
  { href: '/resident/charges', label: 'Charges' },
];

export default async function ResidentLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  if (!session.portals.includes('resident')) {
    const home = session.portals.includes('building') ? '/building'
               : session.portals.includes('operator') ? '/operator'
               : '/login';
    redirect(home);
  }

  // Red-dot guidance: flag setup gaps (no vehicle / no payment method) so the
  // resident can see what's missing and where to fix it.
  const sb = supabaseServer();
  const { data: resident } = await sb
    .from('residents')
    .select('id, stripe_payment_method_id')
    .eq('profile_id', session.user.id)
    .maybeSingle();
  const alerts: string[] = [];
  if (resident) {
    const { data: vehicles } = await sb
      .from('vehicles')
      .select('id, size')
      .eq('resident_id', resident.id);
    // No vehicle at all, or one added before vehicle-type pricing and still
    // missing its type — either way the resident can't be quoted properly until
    // they visit the page.
    if (!vehicles?.length || vehicles.some((v) => !normalizeSize(v.size))) {
      alerts.push('/resident/vehicle');
    }
    if (!resident.stripe_payment_method_id) alerts.push('/resident/payment');
  }

  return (
    <PortalShell nav={NAV} accent="Resident portal" alerts={alerts} user={{ name: session.profile.full_name, sub: session.profile.email, role: session.profile.role }} currentPortal="resident" portals={session.portals}>
      {children}
    </PortalShell>
  );
}
