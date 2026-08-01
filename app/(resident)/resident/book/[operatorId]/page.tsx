import { PageHeader } from '@/components/PortalShell';
import { getSessionUser, supabaseServer, supabaseAdmin } from '@/lib/supabase/server';
import { WAIVER_VERSION } from '@/lib/waiver';
import { listBookableAddons, listRecurringAddonIds } from '@/lib/addons';
import { getPackagesForOperator } from '@/lib/service-packages';
import { standardWashPricing } from '@/lib/wash-pricing';
import { redirect } from 'next/navigation';
import { BookingForm } from './BookingForm';

export default async function BookOperator({
  params,
  searchParams,
}: {
  params: { operatorId: string };
  searchParams: { partnershipId?: string; date?: string; time?: string };
}) {
  const session = await getSessionUser();
  if (!session) redirect('/login');

  const sb = supabaseServer();
  const admin = supabaseAdmin();

  const [{ data: resident }, { data: operator }] = await Promise.all([
    admin.from('residents')
      .select('id, building_id, building:buildings(name)')
      .eq('profile_id', session.user.id)
      .single(),
    admin.from('operators')
      .select('id, name, rating_avg, rating_count, base_price_cents, open_slot_price_cents, description, capacity_per_day, hours_json')
      .eq('id', params.operatorId)
      .eq('status', 'approved')
      .eq('stripe_onboarding_complete', true)
      .single(),
  ]);

  if (!resident || !operator) redirect('/resident/book');

  const [{ data: vehicles }, { data: waiver }, addons, recurringAddonIds, packages, washPricing] = await Promise.all([
    admin
      .from('vehicles')
      .select('id, make, model, color, license_plate, is_primary')
      .eq('resident_id', resident.id)
      .order('is_primary', { ascending: false }),
    admin
      .from('waiver_acceptances')
      .select('id')
      .eq('profile_id', session.user.id)
      .eq('waiver_version', WAIVER_VERSION)
      .maybeSingle(),
    listBookableAddons(admin, operator.id),
    listRecurringAddonIds(admin, resident.id, operator.id),
    getPackagesForOperator(admin, operator.id),
    // The standard wash is the rate the operator set for their regular wash (or
    // the one this building signed), never a price read off their service menu
    // — see lib/wash-pricing.ts.
    standardWashPricing(admin, {
      buildingId: resident.building_id,
      operatorId: operator.id,
      operator,
    }),
  ]);

  const isPartner = !!searchParams.partnershipId;
  const building = resident.building as any;

  return (
    <>
      <PageHeader eyebrow={building.name} title={operator.name} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-6">
            <p className="text-ink-200 leading-relaxed">{operator.description}</p>
            {operator.rating_count > 0 && (
              <div className="mt-5">
                <div className="text-xs text-ink-400">Rating</div>
                <div className="font-display text-2xl">★ {Number(operator.rating_avg).toFixed(1)}</div>
                <div className="text-xs text-ink-400">{operator.rating_count} reviews</div>
              </div>
            )}
          </div>
        </div>

        <BookingForm
          operatorId={operator.id}
          operatorName={operator.name}
          basePriceCents={washPricing.buildingDayCents}
          openSlotPriceCents={washPricing.openSlotCents}
          standardWashAvailable={washPricing.available}
          vehicles={vehicles ?? []}
          isPartner={isPartner}
          partnershipId={searchParams.partnershipId}
          initialDate={searchParams.date}
          initialTimeSlot={searchParams.time}
          waiverAccepted={!!waiver}
          addons={addons}
          initialAddonIds={recurringAddonIds}
          packages={packages}
        />
      </div>
    </>
  );
}
