import { PageHeader } from '@/components/PortalShell';
import { supabaseServer } from '@/lib/supabase/server';
import { OperatorProfileEditor } from './OperatorProfileEditor';
import { PackagesEditor } from './PackagesEditor';
import { AddonsEditor } from './AddonsEditor';
import { InsuranceUploader } from './InsuranceUploader';
import { CrewEditor } from './CrewEditor';
import { PortfolioEditor } from './PortfolioEditor';

export default async function OperatorProfilePage() {
  const sb = supabaseServer();
  const { data: op } = await sb
    .from('operators')
    .select('*, operator_addons(*)')
    .limit(1)
    .maybeSingle();
  if (!op) return null;

  const [{ data: packages }, { data: crew }, { data: portfolio }] = await Promise.all([
    sb.from('service_packages').select('*').eq('operator_id', op.id).order('display_order'),
    sb.from('crew_members').select('*').eq('operator_id', op.id).order('full_name'),
    sb.from('operator_portfolio_items').select('*').eq('operator_id', op.id).order('display_order'),
  ]);

  const insuranceExpiringSoon = op.insurance_expires_at
    ? (new Date(op.insurance_expires_at).getTime() - Date.now()) / 86400000 <= 30
    : false;

  return (
    <>
      <PageHeader eyebrow="Profile" title={op.name} />
      <div className="space-y-6">
        <OperatorProfileEditor op={op} />

        <PortfolioEditor operatorId={op.id} initial={portfolio ?? []} />

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-xl">Stripe Connect</h3>
            {op.stripe_onboarding_complete ? (
              <span className="chip text-gleam">Connected</span>
            ) : (
              <a href="/api/stripe/connect/onboard" className="btn-primary text-sm">Connect bank account →</a>
            )}
          </div>
          {!op.stripe_onboarding_complete ? (
            <p className="text-sm text-ink-400">Connect your bank account to receive payouts from resident bookings.</p>
          ) : (
            <div className="space-y-2 text-sm text-ink-300">
              <a href="/api/stripe/connect/dashboard" className="text-gleam hover:underline">Open Stripe dashboard →</a>
              <p className="text-xs text-ink-500">Payouts, account details, tax forms (1099-K) — all live there.</p>
            </div>
          )}
        </div>

        <PackagesEditor operatorId={op.id} initial={packages ?? []} />

        <AddonsEditor operatorId={op.id} initial={op.operator_addons ?? []} />

        <CrewEditor operatorId={op.id} initial={crew ?? []} />

        <div className="card p-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-xl">Insurance on file</h3>
            {insuranceExpiringSoon && (
              <span className="chip text-amber-300">Expiring soon</span>
            )}
          </div>
          <InsuranceUploader op={op} />
        </div>
      </div>
    </>
  );
}
