import { PageHeader } from '@/components/PortalShell';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { insuranceDocViewUrl } from '@/lib/insurance-doc';
import { redirect } from 'next/navigation';
import { OperatorProfileEditor } from './OperatorProfileEditor';
import { PackagesEditor } from './PackagesEditor';
import { AddonsEditor } from './AddonsEditor';
import { InsuranceUploader } from './InsuranceUploader';
import { CrewEditor } from './CrewEditor';
import { PortfolioEditor } from './PortfolioEditor';
import { WorkingDaysEditor } from './WorkingDaysEditor';
import { StripeConnectSection } from './StripeConnectSection';

export default async function OperatorProfilePage() {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  const sb = supabaseServer();
  const { data: op } = await sb
    .from('operators')
    .select('*, operator_addons(*)')
    .eq('owner_id', session.user.id)
    .maybeSingle();
  if (!op) redirect('/operator/onboarding');

  const [{ data: packages }, { data: crew }, { data: portfolio }] = await Promise.all([
    sb.from('service_packages').select('*').eq('operator_id', op.id).order('display_order'),
    sb.from('crew_members').select('*').eq('operator_id', op.id).order('full_name'),
    sb.from('operator_portfolio_items').select('*').eq('operator_id', op.id).order('display_order'),
  ]);

  const insuranceDocView = await insuranceDocViewUrl(op.insurance_doc_url);

  const insuranceExpiringSoon = op.insurance_expires_at
    ? (new Date(op.insurance_expires_at).getTime() - Date.now()) / 86400000 <= 30
    : false;

  // Required-setup gaps → red dot on the matching section below (mirrors the
  // sidebar dots so the operator can see exactly which card needs attention).
  const activePackages = (packages ?? []).filter((p: any) => p.active);
  const hasWashDays =
    !!op.hours_json &&
    typeof op.hours_json === 'object' &&
    Object.values(op.hours_json as Record<string, any>).some((d: any) => d && d.closed !== true);
  const needsBasics = !op.name || !(op.base_price_cents && op.base_price_cents > 0);
  const needsWashDays = !hasWashDays;
  const needsStripe = !op.stripe_onboarding_complete;
  const needsPackages = activePackages.length === 0;

  return (
    <>
      <PageHeader eyebrow="Profile" title={op.name} />
      <div className="space-y-6">
        <Flagged show={needsBasics}><OperatorProfileEditor op={op} /></Flagged>

        <Flagged show={needsWashDays}><WorkingDaysEditor op={op} /></Flagged>

        <PortfolioEditor operatorId={op.id} initial={portfolio ?? []} />

        <Flagged show={needsStripe}><StripeConnectSection initialConnected={!!op.stripe_onboarding_complete} /></Flagged>

        <Flagged show={needsPackages}><PackagesEditor operatorId={op.id} initial={packages ?? []} /></Flagged>

        <AddonsEditor operatorId={op.id} initial={op.operator_addons ?? []} />

        <CrewEditor operatorId={op.id} initial={crew ?? []} />

        <div className="card p-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-xl">Insurance on file</h3>
            {insuranceExpiringSoon && (
              <span className="chip text-amber-600">Expiring soon</span>
            )}
          </div>
          <InsuranceUploader op={op} docViewUrl={insuranceDocView} />
        </div>
      </div>
    </>
  );
}

/** Wraps a section card with a red dot when it still has a required gap. */
function Flagged({ show, children }: { show: boolean; children: React.ReactNode }) {
  if (!show) return <>{children}</>;
  return (
    <div className="relative">
      <span
        aria-label="Required fields missing"
        className="absolute -right-1 -top-1 z-10 h-3 w-3 rounded-full border-2 border-ink-950 bg-red-500"
      />
      {children}
    </div>
  );
}
