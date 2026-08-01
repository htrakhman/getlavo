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
import { dateShort } from '@/lib/format';
import { hasApprovedInsurance } from '@/lib/insurance';
import { operatorSetup, pendingLabel, setupChipLabel } from '@/lib/operator-readiness';
import { OperatorTabs } from './OperatorTabs';
import { OperatorPricingCard } from './OperatorPricingCard';
import { operatorPricing } from '@/lib/operator-pricing';

export default async function MyOperator() {
  const session = await getSessionUser();
  if (!session) redirect('/login');

  const sb = supabaseServer();
  const admin = supabaseAdmin();

  const { current: bSel } = await getCurrentBuildingForSession(session.user.id);
  const { data: building } = bSel
    ? await admin.from('buildings').select('id, name, wash_day, preferred_wash_day, requested_wash_dates, lat, lng').eq('id', bSel.id).maybeSingle()
    : { data: null };

  // Same "awaiting manager signature" check that flags "My operator" in the
  // sidebar — badges the Contract tab here too so the dot isn't nav-only.
  const { data: pendingContract } = building
    ? await sb
        .from('contracts')
        .select('id')
        .eq('building_id', building.id)
        .eq('status', 'pending_signatures')
        .is('manager_signed_at', null)
        .limit(1)
        .maybeSingle()
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

  // Operator-proposed wash days waiting on this manager's confirmation.
  const { data: pendingProposals } = building && operator
    ? await admin
        .from('wash_days')
        .select('id, scheduled_for')
        .eq('building_id', building.id)
        .eq('confirmation', 'pending')
        .is('completed_at', null)
        .gte('scheduled_for', new Date().toISOString().slice(0, 10))
        .order('scheduled_for', { ascending: true })
    : { data: null };

  // Load marketplace operators when no partner assigned. Operators still
  // finishing setup — or still awaiting our review — are listed too. They're
  // badged below rather than hidden, so a manager can see who is coming online
  // in their area instead of an empty marketplace.
  const { data: operators } = !operator
    ? await sb
        .from('operators')
        .select('id, name, status, description, rating_avg, rating_count, base_price_cents, open_slot_price_cents, service_radius_miles, insurance_expires_at, insurance_review_status, insurance_doc_url, stripe_onboarding_complete, hours_json')
        .in('status', ['approved', 'pending_review'])
        .order('promoted_listing', { ascending: false })
        .order('rating_avg', { ascending: false })
        .limit(20)
    : { data: null };

  // Full menus for the whole page in two batched queries. These double as the
  // readiness signal (an operator with no active package hasn't finished their
  // profile and can't be requested) and as the source for the consolidated
  // pricing panel on each card.
  const operatorIds = (operators ?? []).map((o: any) => o.id);
  const [{ data: packageRows }, { data: addonRows }] = operatorIds.length
    ? await Promise.all([
        sb
          .from('service_packages')
          .select('id, operator_id, name, description, price_cents, size_prices')
          .eq('active', true)
          .in('operator_id', operatorIds)
          .order('display_order', { ascending: true })
          .order('price_cents', { ascending: true }),
        sb
          .from('operator_addons')
          .select('id, operator_id, label, price_cents, size_prices')
          .eq('active', true)
          .in('operator_id', operatorIds)
          .order('price_cents', { ascending: true }),
      ])
    : [{ data: null }, { data: null }];

  const packageCounts = new Map<string, number>();
  for (const row of packageRows ?? []) {
    const id = (row as any).operator_id as string;
    packageCounts.set(id, (packageCounts.get(id) ?? 0) + 1);
  }

  return (
    <>
      <PageHeader eyebrow="Operator" title="My operator" />
      <OperatorTabs active="/building/marketplace" contractPending={!!pendingContract} />

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
                {operators.map((op: any) => {
                  const setup = operatorSetup(op, packageCounts.get(op.id) ?? 0);
                  return (
                    <OperatorPricingCard
                      key={op.id}
                      operatorId={op.id}
                      name={op.name}
                      description={op.description ?? null}
                      ratingAvg={op.rating_avg ?? null}
                      ratingCount={op.rating_count ?? null}
                      serviceRadiusMiles={op.service_radius_miles ?? null}
                      insured={hasApprovedInsurance(op)}
                      requestable={setup.requestable}
                      setupChip={setup.requestable ? null : setupChipLabel(setup)}
                      pendingNote={setup.requestable ? null : pendingLabel(setup.pending)}
                      pricing={operatorPricing(op.id, op, (packageRows ?? []) as any[], (addonRows ?? []) as any[])}
                    />
                  );
                })}
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
              <div className="mt-1 font-display text-xl">{building?.wash_day ?? building?.preferred_wash_day ?? 'TBD'}</div>
            </div>
            <div className="card p-5">
              <div className="text-xs uppercase tracking-widest text-ink-400">Insurance</div>
              <div className="mt-1 font-display text-xl">
                {hasApprovedInsurance(operator)
                  ? `Active · expires ${operator.insurance_expires_at.slice(0, 10)}`
                  : 'Pending verification'}
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

          {(pendingProposals ?? []).length > 0 && (
            <div className="card border-gleam/40 p-6">
              <h3 className="font-display text-lg">
                {operator.name} proposed {pendingProposals!.length === 1 ? 'a wash day' : 'wash days'}
              </h3>
              <p className="mt-1 text-xs text-ink-400">
                Confirm or decline — the date only lands on the calendar once you approve it.
              </p>
              <div className="mt-3 space-y-2">
                {pendingProposals!.map((p: any) => (
                  <Link
                    key={p.id}
                    href={`/building/wash-days/${p.id}`}
                    className="flex items-center justify-between rounded-xl border border-white/10 p-3 text-sm hover:border-gleam/40"
                  >
                    <span>{dateShort(p.scheduled_for)}</span>
                    <span className="text-xs text-gleam">Review &amp; confirm →</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

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
