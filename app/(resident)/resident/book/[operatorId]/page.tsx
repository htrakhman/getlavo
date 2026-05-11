import { PageHeader } from '@/components/PortalShell';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { money } from '@/lib/format';
import { redirect } from 'next/navigation';
import { BookingForm } from './BookingForm';

export default async function BookOperator({
  params,
  searchParams,
}: {
  params: { operatorId: string };
  searchParams: { partnershipId?: string };
}) {
  const session = await getSessionUser();
  if (!session) redirect('/login');

  const sb = supabaseServer();

  const [{ data: resident }, { data: operator }] = await Promise.all([
    sb.from('residents')
      .select('id, building_id, building:buildings(name)')
      .eq('profile_id', session.user.id)
      .single(),
    sb.from('operators')
      .select('id, name, rating_avg, rating_count, base_price_cents, open_slot_price_cents, description, capacity_per_day, hours_json')
      .eq('id', params.operatorId)
      .eq('status', 'approved')
      .eq('stripe_onboarding_complete', true)
      .single(),
  ]);

  if (!resident || !operator) redirect('/resident/book');

  const { data: vehicles } = await sb
    .from('vehicles')
    .select('id, make, model, color, license_plate, is_primary')
    .eq('resident_id', resident.id)
    .order('is_primary', { ascending: false });

  const isPartner = !!searchParams.partnershipId;
  const building = resident.building as any;

  return (
    <>
      <PageHeader eyebrow={building.name} title={operator.name} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-6">
            <p className="text-ink-200 leading-relaxed">{operator.description}</p>
            <div className="mt-5 grid grid-cols-3 gap-4">
              {operator.rating_count > 0 && (
                <div>
                  <div className="text-xs text-ink-400">Rating</div>
                  <div className="font-display text-2xl">★ {Number(operator.rating_avg).toFixed(1)}</div>
                  <div className="text-xs text-ink-400">{operator.rating_count} reviews</div>
                </div>
              )}
              <div>
                <div className="text-xs text-ink-400">Building day</div>
                <div className="font-display text-2xl text-gleam">{money(operator.base_price_cents)}</div>
              </div>
              {operator.open_slot_price_cents && (
                <div>
                  <div className="text-xs text-ink-400">On-demand</div>
                  <div className="font-display text-2xl">{money(operator.open_slot_price_cents)}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        <BookingForm
          operatorId={operator.id}
          operatorName={operator.name}
          basePriceCents={operator.base_price_cents}
          openSlotPriceCents={operator.open_slot_price_cents}
          vehicles={vehicles ?? []}
          isPartner={isPartner}
          partnershipId={searchParams.partnershipId}
        />
      </div>
    </>
  );
}
