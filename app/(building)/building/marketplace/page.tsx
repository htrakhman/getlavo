import { PageHeader } from '@/components/PortalShell';
import { getSessionUser, supabaseServer, supabaseAdmin } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getCurrentBuildingForSession } from '@/lib/building';

export const dynamic = 'force-dynamic';
import { PreferredWashDayForm } from './PreferredWashDayForm';
import { RequestedWashDatesForm } from './RequestedWashDatesForm';
import { IncomingOperatorRequests } from './IncomingOperatorRequests';
import { parseDateList } from '@/lib/wash-dates';
import Link from 'next/link';
import { money } from '@/lib/format';

export default async function MyOperator() {
  const session = await getSessionUser();
  if (!session) redirect('/login');

  const sb = supabaseServer();
  const admin = supabaseAdmin();

  const { current: bSel } = await getCurrentBuildingForSession(session.user.id);
  const { data: building } = bSel
    ? await admin.from('buildings').select('id, name, wash_day, preferred_wash_day, requested_wash_dates, lat, lng').eq('id', bSel.id).maybeSingle()
    : { data: null };

  // Admin client: RLS-scoped partnership reads can silently return nothing for
  // managers, leaving this page stuck on "We're finding your crew" after a match.
  const { data: partnershipRows, error: partnershipError } = building
    ? await admin
        .from('partnerships')
        .select('id, status, operator_id')
        .eq('building_id', building.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
    : { data: null, error: null };
  if (partnershipError) console.error('marketplace: partnership query failed:', partnershipError.message);
  const partnership = partnershipRows?.[0] ?? null;

  // Flat select('*') so a column missing from the live schema can never
  // invalidate the whole query.
  let operator: any = null;
  if (partnership?.operator_id) {
    const { data: opRow, error: opError } = await admin
      .from('operators')
      .select('*')
      .eq('id', partnership.operator_id)
      .maybeSingle();
    if (opError) console.error('marketplace: operator query failed:', opError.message);
    operator = opRow ?? null;
  }

  const { data: incomingOperatorRequests } = building && !operator
    ? await admin
        .from('partnerships')
        .select(
          'id, created_at, requested_by, operator:operators(name, description, rating_avg, rating_count, owner_id)',
        )
        .eq('building_id', building.id)
        .eq('status', 'pending')
    : { data: null };

  const operatorRequests = ((incomingOperatorRequests ?? []) as any[]).filter((p) => {
    const op = Array.isArray(p.operator) ? p.operator[0] : p.operator;
    return op && p.requested_by === op.owner_id;
  });

  // Load marketplace operators when no partner assigned
  const { data: operators } = !operator
    ? await sb
        .from('operators')
        .select('id, name, description, rating_avg, rating_count, base_price_cents, open_slot_price_cents, service_radius_miles, insurance_expires_at')
        .eq('status', 'approved')
        .order('promoted_listing', { ascending: false })
        .order('rating_avg', { ascending: false })
        .limit(20)
    : { data: null };

  return (
    <>
      <PageHeader eyebrow="Operator" title="My operator" />

      {!operator ? (
        <div className="space-y-8">
          {operatorRequests.length > 0 && (
            <IncomingOperatorRequests requests={operatorRequests as any[]} />
          )}

          {/* Waiting state */}
          <div className="card border-gleam/30 p-6">
            <h3 className="font-display text-xl">We're finding your crew</h3>
            <p className="mt-2 text-sm text-ink-300">
              Lavo is finding a car wash operator for your building. We'll notify you when one is assigned.
            </p>
          </div>

          {/* Preferred wash day */}
          <div className="card p-6">
            <h3 className="font-display text-lg">Tell us your preferred wash day</h3>
            <p className="mt-1 text-xs text-ink-400">
              We'll do our best to match an operator who can serve your building on this day.
            </p>
            <PreferredWashDayForm
              buildingId={building?.id ?? ''}
              initial={building?.preferred_wash_day ?? ''}
            />
          </div>

          {/* Requested wash dates */}
          <div className="card p-6">
            <h3 className="font-display text-lg">Request specific wash dates</h3>
            <p className="mt-1 text-xs text-ink-400">
              Pick the exact dates you want service. Operators see them alongside your building, and
              they become your operator&rsquo;s confirmed wash days once you&rsquo;re matched.
            </p>
            <RequestedWashDatesForm
              buildingId={building?.id ?? ''}
              initial={parseDateList(building?.requested_wash_dates)}
              matched={false}
            />
          </div>

          {/* Marketplace */}
          <div>
            <div className="mb-4 flex items-center gap-4">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs uppercase tracking-widest text-ink-400">or choose from our marketplace</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            {operators && operators.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {operators.map((op: any) => (
                  <Link
                    key={op.id}
                    href={`/building/marketplace/${op.id}`}
                    className="card p-5 hover:border-gleam/40 transition-colors block"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-display text-lg truncate">{op.name}</div>
                        {op.rating_count > 0 && (
                          <div className="mt-0.5 text-xs text-ink-400">
                            ★ {Number(op.rating_avg).toFixed(1)} · {op.rating_count} reviews
                          </div>
                        )}
                        {op.description && (
                          <p className="mt-2 text-sm text-ink-300 line-clamp-2">{op.description}</p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-display text-xl text-gleam">{money(op.base_price_cents)}</div>
                        <div className="text-xs text-ink-400">per building day</div>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-ink-400">
                      {op.service_radius_miles && (
                        <span className="chip">{op.service_radius_miles} mi radius</span>
                      )}
                      {op.open_slot_price_cents && (
                        <span className="chip">On-demand {money(op.open_slot_price_cents)}</span>
                      )}
                      {op.insurance_expires_at && (
                        <span className="chip text-gleam/80">✓ Insured</span>
                      )}
                    </div>
                    <div className="mt-4 text-xs text-gleam">View & request →</div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="card p-6 text-center text-sm text-ink-400">
                No operators are available in your area yet — we're expanding fast. We'll reach out as soon as one is nearby.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-widest text-ink-400">Your operator</div>
                <div className="mt-1 font-display text-2xl">{operator.name}</div>
                {operator.rating_count > 0 && (
                  <div className="mt-1 text-sm text-ink-400">
                    ★ {Number(operator.rating_avg).toFixed(1)} · {operator.rating_count} reviews
                  </div>
                )}
              </div>
              <span className="chip text-gleam capitalize">{partnership?.status}</span>
            </div>
            {operator.description && (
              <p className="mt-4 text-sm text-ink-300 leading-relaxed">{operator.description}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="card p-5">
              <div className="text-xs uppercase tracking-widest text-ink-400">Wash day</div>
              <div className="mt-1 font-display text-xl">{building?.wash_day ?? 'TBD'}</div>
            </div>
            <div className="card p-5">
              <div className="text-xs uppercase tracking-widest text-ink-400">Insurance</div>
              <div className="mt-1 font-display text-xl">
                {operator.insurance_expires_at
                  ? `Active · expires ${operator.insurance_expires_at.slice(0, 10)}`
                  : 'On file'}
              </div>
            </div>
            {(operator.contact_email || operator.contact_phone) && (
              <div className="card p-5 md:col-span-2">
                <div className="text-xs uppercase tracking-widest text-ink-400">Contact</div>
                <div className="mt-1 text-sm text-ink-200">
                  {operator.contact_email && <div>{operator.contact_email}</div>}
                  {operator.contact_phone && <div>{operator.contact_phone}</div>}
                </div>
              </div>
            )}
          </div>

          <div className="card p-6">
            <h3 className="font-display text-lg">Choose wash dates</h3>
            <p className="mt-1 text-xs text-ink-400">
              Dates you save here are confirmed onto {operator.name}&rsquo;s calendar — your building&rsquo;s
              schedule takes priority over the crew&rsquo;s general availability.
            </p>
            <RequestedWashDatesForm
              buildingId={building?.id ?? ''}
              initial={parseDateList(building?.requested_wash_dates)}
              matched
            />
          </div>
        </div>
      )}
    </>
  );
}
