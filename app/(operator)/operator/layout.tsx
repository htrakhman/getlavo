import { PortalShell } from '@/components/PortalShell';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
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

  // Red-dot guidance: flag the nav sections that still have required setup gaps
  // so the operator can see at a glance what's missing and where to go.
  const alerts = await operatorSetupAlerts(session.user.id);

  return (
    <PortalShell nav={NAV} accent="Operator portal" alerts={alerts} user={{ name: session.profile.full_name, sub: session.profile.email, role: session.profile.role }} currentPortal="operator" portals={session.portals}>
      {children}
    </PortalShell>
  );
}

async function operatorSetupAlerts(ownerId: string): Promise<string[]> {
  const sb = supabaseServer();
  const { data: op } = await sb
    .from('operators')
    .select('id, name, base_price_cents, hours_json, stripe_onboarding_complete, insurance_doc_url, insurance_review_status')
    .eq('owner_id', ownerId)
    .maybeSingle();
  if (!op) return [];

  const { count: packageCount } = await sb
    .from('service_packages')
    .select('*', { count: 'exact', head: true })
    .eq('operator_id', op.id)
    .eq('active', true);

  const hasWashDays =
    !!op.hours_json &&
    typeof op.hours_json === 'object' &&
    Object.values(op.hours_json as Record<string, any>).some((d: any) => d && d.closed !== true);

  const profileIncomplete =
    !op.name ||
    !(op.base_price_cents && op.base_price_cents > 0) ||
    !hasWashDays ||
    !packageCount ||
    !op.stripe_onboarding_complete;

  const complianceIncomplete =
    !op.insurance_doc_url || ['rejected', 'expired'].includes(op.insurance_review_status ?? '');

  const alerts: string[] = [];
  if (profileIncomplete) alerts.push('/operator/profile');
  if (complianceIncomplete) alerts.push('/operator/compliance');
  return alerts;
}
