import { PageHeader } from '@/components/PortalShell';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { haversineMiles } from '@/lib/geo';
import { money } from '@/lib/format';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function ResidentBook() {
  const session = await getSessionUser();
  if (!session) redirect('/login');

  const sb = supabaseServer();

  const { data: resident } = await sb
    .from('residents')
    .select('id, building_id, building:buildings(name, lat, lng)')
    .eq('profile_id', session.user.id)
    .single();
  if (!resident) redirect('/resident/onboarding');

  const building = resident.building as any;

  // Active partnership operator (cheaper building-day rate)
  const { data: partnership } = await sb
    .from('partnerships')
    .select('id, operator:operators(id, name, slug, rating_avg, rating_count, base_price_cents, open_slot_price_cents, description, lat, lng, service_radius_miles, capacity_per_day)')
    .eq('building_id', resident.building_id)
    .eq('status', 'active')
    .maybeSingle();

  const partnerOperator = (partnership?.operator as any) ?? null;

  // Additional nearby operators with open slots
  let nearbyOperators: any[] = [];
  if (building.lat && building.lng) {
    const excludeIds = partnerOperator ? [partnerOperator.id] : [];
    const { data: allOps } = await sb
      .from('operators')
      .select('id, name, slug, rating_avg, rating_count, base_price_cents, open_slot_price_cents, lat, lng, service_radius_miles, description')
      .eq('status', 'approved')
      .eq('stripe_onboarding_complete', true);

    nearbyOperators = (allOps ?? [])
      .filter((op) => {
        if (excludeIds.includes(op.id)) return false;
        if (!op.lat || !op.lng) return false;
        return haversineMiles(building.lat, building.lng, op.lat, op.lng) <= op.service_radius_miles;
      })
      .sort((a, b) => {
        const distA = haversineMiles(building.lat, building.lng, a.lat, a.lng);
        const distB = haversineMiles(building.lat, building.lng, b.lat, b.lng);
        return distA - distB;
      });
  }

  return (
    <>
      <PageHeader eyebrow={building.name} title="Book a wash" />

      {partnerOperator && (
        <div className="mb-8">
          <div className="mb-3 text-xs uppercase tracking-widest text-gleam">Your building partner · best rate</div>
          <Link
            href={`/resident/book/${partnerOperator.id}?partnershipId=${partnership!.id}`}
            className="card block p-6 hover:border-gleam/30 transition"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="font-display text-xl">{partnerOperator.name}</div>
                {partnerOperator.rating_count > 0 && (
                  <div className="mt-0.5 text-sm text-ink-400">
                    ★ {Number(partnerOperator.rating_avg).toFixed(1)} · {partnerOperator.rating_count} reviews
                  </div>
                )}
                <p className="mt-2 text-sm text-ink-300 line-clamp-2">{partnerOperator.description}</p>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-xs text-ink-400">Building day</div>
                <div className="font-display text-xl text-gleam">{money(partnerOperator.base_price_cents)}</div>
                {partnerOperator.open_slot_price_cents && (
                  <>
                    <div className="mt-2 text-xs text-ink-400">On-demand</div>
                    <div className="font-display text-lg">{money(partnerOperator.open_slot_price_cents)}</div>
                  </>
                )}
              </div>
            </div>
          </Link>
        </div>
      )}

      {nearbyOperators.length > 0 && (
        <div>
          <div className="mb-3 text-xs uppercase tracking-widest text-ink-400">
            {partnerOperator ? 'Other operators near you' : 'Operators near you'}
          </div>
          <div className="space-y-3">
            {nearbyOperators.map((op) => {
              const dist = building.lat && building.lng && op.lat && op.lng
                ? haversineMiles(building.lat, building.lng, op.lat, op.lng).toFixed(1)
                : null;
              return (
                <Link
                  key={op.id}
                  href={`/resident/book/${op.id}`}
                  className="card block p-5 hover:border-white/20 transition"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="font-medium">{op.name}</div>
                      <div className="mt-0.5 text-xs text-ink-400">
                        {op.rating_count > 0 && <>★ {Number(op.rating_avg).toFixed(1)} · </>}
                        {dist && <>{dist} mi away</>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs text-ink-400">On-demand</div>
                      <div className="font-display text-lg">
                        {money(op.open_slot_price_cents ?? op.base_price_cents)}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {!partnerOperator && nearbyOperators.length === 0 && (
        <div className="card p-8 text-center">
          <div className="text-3xl mb-3">🔍</div>
          <h2 className="font-display text-xl">No operators nearby yet</h2>
          <p className="mt-2 text-sm text-ink-400">
            We're growing our operator network. Check back soon.
          </p>
        </div>
      )}
    </>
  );
}
