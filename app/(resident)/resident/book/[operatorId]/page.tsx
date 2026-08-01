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
      // The booking form pre-fills everything the operator needs to find the
      // car, so the resident never retypes what their account already knows.
      .select('id, building_id, unit_number, spot_label, vehicle_access_notes, building:buildings(name, address_line1, address_line2, city, region, postal_code)')
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
      .select('id, make, model, color, year, license_plate, notes, is_primary')
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
    // The standard wash is priced off the building's agreement with this
    // operator, not off the operator's service menu — see lib/wash-pricing.ts.
    standardWashPricing(admin, {
      buildingId: resident.building_id,
      operatorId: operator.id,
      operator,
    }),
  ]);

  const isPartner = !!searchParams.partnershipId;
  const building = resident.building as any;

  const buildingAddress =
    [
      [building?.address_line1, building?.address_line2].filter(Boolean).join(' '),
      building?.city,
      [building?.region, building?.postal_code].filter(Boolean).join(' '),
    ]
      .filter((part) => part && String(part).trim())
      .join(', ') || null;

  return (
    <>
      <PageHeader eyebrow={building.name} title={operator.name} />

      <BookingForm
        operatorId={operator.id}
        operatorName={operator.name}
        operatorDescription={operator.description}
        ratingAvg={operator.rating_avg}
        ratingCount={operator.rating_count ?? 0}
        basePriceCents={washPricing.buildingDayCents}
        openSlotPriceCents={washPricing.openSlotCents}
        vehicles={vehicles ?? []}
        isPartner={isPartner}
        partnershipId={searchParams.partnershipId}
        initialDate={searchParams.date}
        initialTimeSlot={searchParams.time}
        waiverAccepted={!!waiver}
        addons={addons}
        initialAddonIds={recurringAddonIds}
        packages={packages}
        resident={{
          buildingName: building?.name ?? '—',
          buildingAddress,
          unitNumber: resident.unit_number ?? null,
          spotLabel: resident.spot_label ?? null,
          accessNotes: resident.vehicle_access_notes ?? null,
        }}
      />
    </>
  );
}
