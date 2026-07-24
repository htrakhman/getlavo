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

  return (
    <>
      <PageHeader eyebrow="Profile" title={op.name} />
      <div className="space-y-6">
        <OperatorProfileEditor op={op} />

        <WorkingDaysEditor op={op} />

        <PortfolioEditor operatorId={op.id} initial={portfolio ?? []} />

        <StripeConnectSection initialConnected={!!op.stripe_onboarding_complete} />

        <PackagesEditor operatorId={op.id} initial={packages ?? []} />

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
