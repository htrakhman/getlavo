import { PageHeader } from '@/components/PortalShell';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { money } from '@/lib/format';
import { redirect } from 'next/navigation';
import { PartnershipConnector } from './PartnershipConnector';

export default async function OperatorDetail({ params }: { params: { id: string } }) {
  const session = await getSessionUser();
  if (!session) redirect('/login');

  const sb = supabaseServer();

  const [{ data: op }, { data: addons }, { data: building }] = await Promise.all([
    sb.from('operators').select('*').eq('id', params.id).single(),
    sb.from('operator_addons').select('*').eq('operator_id', params.id).eq('active', true),
    sb.from('buildings').select('id').limit(1).maybeSingle(),
  ]);
  if (!op || !building) return <div>Not found.</div>;

  // Check existing partnership status
  const { data: existingPartnership } = await sb
    .from('partnerships')
    .select('status')
    .eq('building_id', building.id)
    .eq('operator_id', op.id)
    .maybeSingle();

  const existingStatus = (existingPartnership?.status as 'pending' | 'active' | 'declined') ?? 'none';

  return (
    <>
      <PageHeader eyebrow="Marketplace" title={op.name} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <p className="text-ink-200 leading-relaxed">{op.description}</p>
            <div className="mt-5 grid grid-cols-3 gap-4">
              {op.rating_count > 0 && (
                <div>
                  <div className="text-xs text-ink-400">Rating</div>
                  <div className="font-display text-2xl">★ {Number(op.rating_avg).toFixed(1)}</div>
                  <div className="text-xs text-ink-400">{op.rating_count} reviews</div>
                </div>
              )}
              <div>
                <div className="text-xs text-ink-400">Building day</div>
                <div className="font-display text-2xl text-gleam">{money(op.base_price_cents)}</div>
              </div>
              {op.open_slot_price_cents && (
                <div>
                  <div className="text-xs text-ink-400">On-demand</div>
                  <div className="font-display text-2xl">{money(op.open_slot_price_cents)}</div>
                </div>
              )}
              {op.service_radius_miles && (
                <div>
                  <div className="text-xs text-ink-400">Service radius</div>
                  <div className="font-display text-2xl">{op.service_radius_miles} mi</div>
                </div>
              )}
            </div>
          </div>
          <div className="card p-6">
            <h3 className="font-display text-xl">Add-ons offered to residents</h3>
            <ul className="mt-4 divide-y divide-white/5">
              {(addons ?? []).map((a) => (
                <li key={a.id} className="flex items-center justify-between py-3">
                  <span>{a.label}</span>
                  <span className="chip">{money(a.price_cents)}</span>
                </li>
              ))}
              {!addons?.length && <li className="py-3 text-sm text-ink-400">No add-ons listed.</li>}
            </ul>
          </div>
        </div>
        <PartnershipConnector
          operatorId={op.id}
          buildingId={building.id}
          basePriceCents={op.base_price_cents}
          openSlotPriceCents={op.open_slot_price_cents ?? null}
          existingStatus={existingStatus as any}
        />
      </div>
    </>
  );
}
