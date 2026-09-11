import { PageHeader } from '@/components/PortalShell';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { BuildingSettingsForm } from './BuildingSettingsForm';
import { GarageLayoutEditor } from './GarageLayoutEditor';
import { BillingArrangementPanel } from './BillingArrangementPanel';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { normalizeBillingMode } from '@/lib/billing-arrangement';

export default async function BuildingSettings() {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  const { getCurrentBuildingForSession } = await import('@/lib/building');
  const { current: building } = await getCurrentBuildingForSession(session.user.id);
  if (!building) redirect('/building/onboarding');

  // The arrangement lives on the executed agreement, and the card lives on the
  // building. Read both so the panel can show what is actually in force.
  const admin = supabaseAdmin();
  const [{ data: contract }, { data: buildingRow }] = await Promise.all([
    admin
      .from('contracts')
      .select('billing_mode, property_subsidy_cents')
      .eq('building_id', building.id)
      .eq('status', 'executed')
      .order('fully_executed_at', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from('buildings')
      .select('stripe_payment_method_id')
      .eq('id', building.id)
      .maybeSingle(),
  ]);

  // Show the saved card as the manager would recognise it. A lookup failure
  // must not take the settings page down with it.
  let cardLabel: string | null = null;
  if (buildingRow?.stripe_payment_method_id && process.env.STRIPE_SECRET_KEY) {
    try {
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
      const pm = await stripe.paymentMethods.retrieve(buildingRow.stripe_payment_method_id);
      if (pm.card) cardLabel = `${pm.card.brand.toUpperCase()} ending ${pm.card.last4}`;
    } catch (e) {
      console.error('building settings: card lookup failed', e);
    }
  }

  return (
    <>
      <PageHeader eyebrow={building.name} title="Building settings" />
      <BuildingSettingsForm building={building} />

      <div className="mt-12">
        <BillingArrangementPanel
          initialMode={normalizeBillingMode(contract?.billing_mode)}
          initialSubsidyCents={Math.max(0, contract?.property_subsidy_cents ?? 0)}
          hasCardOnFile={!!buildingRow?.stripe_payment_method_id}
          cardLabel={cardLabel}
          hasExecutedAgreement={!!contract}
        />
      </div>

      <div className="mt-12">
        <h2 className="font-display text-2xl">Garage layout</h2>
        <p className="mb-6 mt-2 max-w-2xl text-sm text-ink-400">
          Define your garage structure so the wash crew can navigate it. The operator sees vehicles grouped by floor on wash day.
        </p>
        <GarageLayoutEditor buildingId={building.id} initial={building.garage_levels_json ?? []} />
      </div>
    </>
  );
}
