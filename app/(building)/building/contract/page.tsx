import { PageHeader } from '@/components/PortalShell';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { getCurrentBuildingForSession } from '@/lib/building';
import { redirect } from 'next/navigation';
import { ContractDraftSigner } from './ContractDraftSigner';
import { supabaseAdmin } from '@/lib/supabase/admin';
import Link from 'next/link';
import { money } from '@/lib/format';
import { hasApprovedInsurance } from '@/lib/insurance';
import { OperatorTabs } from '../marketplace/OperatorTabs';
import { resolveGoverningLaw } from '@/lib/governing-law';
import { getPendingAgreementsForManager } from '@/lib/pending-agreements';
import { MINIMUM_CUTOFF_HOURS } from '@/lib/wash-day-minimum';
import { normalizeBillingMode, describeBillingArrangement } from '@/lib/billing-arrangement';
import { PendingAgreementsBanner } from './PendingAgreementsBanner';

export const dynamic = 'force-dynamic';

const BLANK = (label: string) => (
  <span className="inline-block min-w-[120px] border-b border-dashed border-ink-500 text-ink-500 italic px-1">
    {label}
  </span>
);

export default async function ContractPage() {
  const session = await getSessionUser();
  // Preserve the destination so a manager arriving from the offer email lands
  // back on this accept/reject page right after logging in.
  if (!session) redirect('/login?redirect=/building/contract');

  const sb = supabaseServer();
  const admin = supabaseAdmin();
  const { current: building } = await getCurrentBuildingForSession(session.user.id);
  if (!building) redirect('/building/onboarding');

  const { data: bFull } = await sb
    .from('buildings')
    .select('id, name, address_line1, city, region, postal_code, wash_day, preferred_wash_day')
    .eq('id', building.id)
    .maybeSingle();

  // Active/pending partnership → auto-fill operator. The query is deliberately
  // minimal: select('*') (a named column missing from the live schema voids the
  // whole query) and NO status filter in SQL — filtering `.in('status', [...])`
  // with a literal that isn't in the partnership_status enum (e.g. 'pilot',
  // which this page shipped with) makes Postgres reject the ENTIRE query, and
  // the page silently rendered "not matched". Statuses are filtered in JS.
  const { data: partnershipRows, error: partnershipError } = await admin
    .from('partnerships')
    .select('*')
    .eq('building_id', building.id);
  if (partnershipError) console.error('contract: partnership query failed:', partnershipError.message);

  // Prefer the confirmed relationship over any stray pending request rows.
  const statusRank: Record<string, number> = { active: 0, pilot: 1, pending: 2 };
  const partnership = (partnershipRows ?? [])
    .filter((p: any) => p.status in statusRank)
    .sort(
      (a: any, b: any) =>
        (statusRank[a.status] ?? 9) - (statusRank[b.status] ?? 9) ||
        String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')),
    )[0] ?? null;

  let op: any = null;
  let operatorError: string | null = null;
  if (partnership?.operator_id) {
    const { data: opRow, error: opError } = await admin
      .from('operators')
      .select('*')
      .eq('id', partnership.operator_id)
      .maybeSingle();
    if (opError) {
      operatorError = opError.message;
      console.error('contract: operator query failed:', opError.message);
    }
    op = opRow ?? null;
  }

  // Existing or auto-created contract
  let { data: contract } = await admin
    .from('contracts')
    .select('*')
    .eq('building_id', building.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // The contract itself is the fallback source for the operator.
  //
  // This page derived the operator ONLY from `partnerships`, but an
  // operator-initiated offer (/api/contracts/send) writes a contracts row and
  // no partnership — partnership rows are created solely by the admin
  // assign-operator route and the seed script. With no partnership the whole
  // agreement collapsed to the "No agreement yet" empty state, so a manager
  // who followed the offer email was told nothing was waiting and had no way
  // to sign the contract that plainly existed. Read the operator off the
  // contract when the partnership is missing.
  if (!op && contract?.operator_id) {
    const { data: opRow, error: opError } = await admin
      .from('operators')
      .select('*')
      .eq('id', contract.operator_id)
      .maybeSingle();
    if (opError) {
      operatorError = opError.message;
      console.error('contract: operator-from-contract query failed:', opError.message);
    }
    op = opRow ?? null;
  }

  // Auto-create a draft contract when both parties are present and no contract exists yet
  if (!contract && op) {
    const washDay = bFull?.wash_day || bFull?.preferred_wash_day || null;
    const { data: newContract, error: insertError } = await admin.from('contracts').insert({
      building_id: building.id,
      operator_id: op.id,
      status: 'pending_signatures',
      service_day: washDay,
      governing_law: resolveGoverningLaw(bFull?.region),
      price_per_wash_cents: op.base_price_cents,
    }).select().single();
    contract = newContract;
    if (insertError) {
      // A column or enum value missing from the live schema fails the full
      // insert; retry with the minimal shape so signing isn't silently blocked.
      console.error('contract: draft insert failed:', insertError.message);
      const { data: minimalContract, error: retryError } = await admin.from('contracts').insert({
        building_id: building.id,
        operator_id: op.id,
        price_per_wash_cents: op.base_price_cents,
      }).select().single();
      if (retryError) console.error('contract: minimal draft insert failed:', retryError.message);
      contract = minimalContract;
    }
  }

  // Fetch operator packages and addons for auto-fill. Runs after the operator
  // is resolved from either source so a contract-sourced operator still gets
  // its packages rendered into the agreement.
  const [{ data: packages }, { data: addons }] = op
    ? await Promise.all([
        admin.from('service_packages').select('name, description, price_cents').eq('operator_id', op.id).eq('active', true).order('display_order'),
        admin.from('operator_addons').select('label, price_cents').eq('operator_id', op.id).eq('active', true),
      ])
    : [{ data: null }, { data: null }];

  const minBookings = Math.max(0, op?.min_bookings_per_day ?? 0);
  const billingMode = normalizeBillingMode(contract?.billing_mode);
  const propertySubsidyCents = Math.max(0, contract?.property_subsidy_cents ?? 0);
  const managerName = session.profile.full_name || session.profile.email;
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const address = bFull
    ? `${bFull.address_line1}, ${bFull.city}, ${bFull.region} ${bFull.postal_code}`
    : null;
  const governingLaw = resolveGoverningLaw(bFull?.region, contract?.governing_law);

  const isSigned = !!contract?.manager_signed_at;
  const operatorSigned = !!contract?.operator_signed_at;
  const isFullyExecuted = contract?.status === 'executed' || (isSigned && operatorSigned);
  // Same condition the sidebar uses to red-dot "My operator" — badges the
  // Contract tab here too so the dot isn't nav-only.
  const contractPending = contract?.status === 'pending_signatures' && !isSigned;

  // Every building with an open agreement, current one included — a flat
  // list rather than an implicit-current/explicit-others split. This page can
  // only render one building's agreement at a time, so without this the rest
  // stay invisible and a manager who signs the one they landed on believes
  // they are done.
  const pendingAgreements = await getPendingAgreementsForManager(session.user.id);
  // Once this building is signed it drops out of the pending list, so the head
  // of what's left is genuinely the next one to sign.
  const nextPending = pendingAgreements.find((p) => p.buildingId !== building.id) ?? null;

  return (
    <>
      <PageHeader eyebrow={building.name} title="Service agreement" />
      <OperatorTabs active="/building/contract" contractPending={contractPending} />

      <PendingAgreementsBanner pending={pendingAgreements} currentBuildingId={building.id} />

      {isFullyExecuted && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-gleam/30 bg-gleam/10 px-5 py-3">
          <span className="text-gleam text-lg">✓</span>
          <div>
            <div className="text-sm font-medium text-gleam">Agreement fully executed</div>
            <div className="text-xs text-ink-400">
              Signed by both parties · {contract?.fully_executed_at?.slice(0, 10) || contract?.manager_signed_at?.slice(0, 10)}
            </div>
          </div>
          {contract?.id && (
            <a href={`/api/contracts/${contract.id}/pdf`} className="btn-quiet ml-auto text-xs" target="_blank" rel="noreferrer">
              Download PDF
            </a>
          )}
        </div>
      )}

      {isSigned && !operatorSigned && !isFullyExecuted && (
        <div className="mb-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-5 py-3 text-sm text-amber-600">
          You've signed. We've notified the operator — awaiting their signature.
        </div>
      )}

      {contract?.status === 'cancelled' && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-3 text-sm text-red-400">
          You declined this agreement. The operator has been notified.
          {contract?.cancellation_reason ? ` Reason: ${contract.cancellation_reason}` : ''}
        </div>
      )}

      {op && partnership?.status === 'pending' && (
        <div className="mb-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-5 py-3 text-sm text-amber-600">
          {op.name} hasn&rsquo;t accepted your partnership request yet. Their details are pre-filled
          below so you can review the agreement — it only takes effect once both parties sign.
        </div>
      )}

      {/* If the operator ever fails to resolve again, the page explains itself
          instead of needing another round of log spelunking. */}
      {!op && (
        <details className="mb-6 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-xs text-ink-500">
          <summary className="cursor-pointer">Diagnostics (for support)</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(
              {
                build: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local',
                buildingId: building.id,
                buildingName: building.name,
                partnershipRowsForBuilding: (partnershipRows ?? []).map((p: any) => ({
                  id: p.id,
                  status: p.status,
                  operator_id: p.operator_id,
                })),
                partnershipQueryError: partnershipError?.message ?? null,
                operatorQueryError: operatorError,
                pickedPartnershipId: partnership?.id ?? null,
              },
              null,
              2,
            )}
          </pre>
        </details>
      )}

      {!op ? (
        <div className="mx-auto max-w-3xl">
          <div className="card border-gleam/30 p-6">
            <h3 className="font-display text-xl">No agreement yet</h3>
            <p className="mt-2 text-sm text-ink-300">
              Your service agreement will appear here once Lavo matches your building with a car wash
              operator.{' '}
              <Link href="/building/marketplace" className="underline underline-offset-2">
                Check operator status →
              </Link>
            </p>
          </div>
        </div>
      ) : (
      <div className="mx-auto max-w-3xl">
        <div className="legal-doc rounded-2xl border border-slate-300 shadow-sm">
          {/* Header */}
          <div className="border-b border-white/10 px-10 py-8 text-center">
            <div className="text-xs uppercase tracking-[0.25em] text-gleam">Lavo</div>
            <h2 className="mt-2 font-display text-3xl">Car Wash Service Agreement</h2>
            <p className="mt-2 text-sm text-ink-400">
              Effective date: {isSigned ? contract?.manager_signed_at?.slice(0, 10) : today}
            </p>
          </div>

          <div className="space-y-8 px-10 py-8 text-sm leading-relaxed text-ink-200">

            {/* Parties */}
            <section>
              <h3 className="mb-3 font-display text-lg text-white">1. Parties</h3>
              <p>
                This Service Agreement (&ldquo;Agreement&rdquo;) is entered into between:
              </p>
              <p className="mt-3 text-xs text-ink-400">
                &ldquo;Property&rdquo; means the building, buildings or premises identified above,
                whether residential or commercial. &ldquo;Occupants&rdquo; means the residents and
                tenants of the Property, and the employees, staff and authorized visitors of those
                tenants, who book Services under this Agreement. A tenant that is a business books
                through the individuals it authorizes.
              </p>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl bg-white/5 p-4">
                  <div className="mb-2 text-xs uppercase tracking-widest text-ink-400">Property Manager</div>
                  <div className="font-medium text-white">{managerName}</div>
                  <div className="mt-1 text-ink-300">{building.name}</div>
                  <div className="mt-0.5 text-xs text-ink-400">{address ?? '—'}</div>
                  <div className="mt-0.5 text-xs text-ink-400">{session.profile.email}</div>
                </div>
                <div className="rounded-xl bg-white/5 p-4">
                  <div className="mb-2 text-xs uppercase tracking-widest text-ink-400">Service Provider</div>
                  <div className="font-medium text-white">{op.name}</div>
                  {op.contact_email && <div className="mt-0.5 text-xs text-ink-400">{op.contact_email}</div>}
                  {op.contact_phone && <div className="mt-0.5 text-xs text-ink-400">{op.contact_phone}</div>}
                </div>
              </div>
            </section>

            {/* Services */}
            <section>
              <h3 className="mb-3 font-display text-lg text-white">2. Services</h3>
              <p>
                Service Provider agrees to provide car wash services (&ldquo;Services&rdquo;) at the
                Property:{' '}
                <strong className="text-white">{building.name}</strong>,{' '}
                {address ?? BLANK('building address')}.
              </p>
              <ul className="mt-3 space-y-2 pl-4">
                <li>
                  <span className="text-ink-400">Service dates:</span>{' '}
                  <strong className="text-white">Scheduled through the Lavo platform</strong>
                  <div className="mt-1 text-xs text-ink-400">
                    Service Provider proposes dates and Property Manager confirms them. Either party
                    may decline a proposed date, and a date that is not confirmed creates no
                    obligation for either party.
                  </div>
                </li>
                <li>
                  <span className="text-ink-400">Frequency:</span>{' '}
                  <strong className="text-white">No fixed cadence</strong>
                  <div className="mt-1 text-xs text-ink-400">
                    This Agreement commits neither party to any particular day of the week or number
                    of visits. Service Provider sets their own availability and may change it at any
                    time.
                  </div>
                </li>
                <li>
                  <span className="text-ink-400">Minimum bookings per wash day:</span>{' '}
                  <strong className="text-white">{minBookings > 0 ? minBookings : 'None'}</strong>
                  {minBookings > 0 ? (
                    <div className="mt-1 text-xs text-ink-400">
                      A scheduled wash day carrying fewer than {minBookings}{' '}
                      {minBookings === 1 ? 'booking' : 'bookings'} {MINIMUM_CUTOFF_HOURS} hours
                      beforehand is cancelled automatically and every affected Occupant is refunded
                      in full. Service Provider is under no obligation to attend a wash day that
                      does not meet this minimum, and no penalty arises from a day cancelled this
                      way.
                    </div>
                  ) : (
                    <div className="mt-1 text-xs text-ink-400">
                      Service Provider attends every scheduled wash day regardless of how many
                      Occupants book it.
                    </div>
                  )}
                </li>
                <li>
                  <span className="text-ink-400">Service location:</span>{' '}
                  <strong className="text-white">Parking area at the Property designated by Property Manager</strong>
                </li>
              </ul>

              {/* Packages */}
              {packages && packages.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-ink-400">Service packages offered by Provider:</p>
                  <div className="rounded-xl bg-white/5 p-4 space-y-2">
                    {packages.map((p: any) => (
                      <div key={p.name} className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-white">{p.name}</span>
                          {p.description && <span className="ml-2 text-xs text-ink-400">{p.description}</span>}
                        </div>
                        <span className="text-gleam text-sm">{money(p.price_cents)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add-ons */}
              {addons && addons.length > 0 && (
                <div className="mt-3">
                  <p className="mb-2 text-ink-400">Optional add-ons available to Occupants:</p>
                  <div className="rounded-xl bg-white/5 p-4 space-y-2">
                    {addons.map((a: any) => (
                      <div key={a.label} className="flex items-center justify-between">
                        <span className="text-ink-200">{a.label}</span>
                        <span className="text-gleam text-sm">{money(a.price_cents)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Fees */}
            <section>
              <h3 className="mb-3 font-display text-lg text-white">3. Fees &amp; Payment</h3>
              <p>
                {billingMode === 'property_pays' ? (
                  <>
                    Property Manager pays for each wash via the Lavo platform, charged to the
                    payment method kept on file for the Property. Occupants book at no charge to
                    themselves. Lavo collects a platform fee from each transaction.
                  </>
                ) : billingMode === 'property_subsidized' ? (
                  <>
                    Property Manager covers{' '}
                    <strong className="text-white">{money(propertySubsidyCents)}</strong> of each
                    wash, charged to the payment method kept on file for the Property, and the
                    Occupant pays the remainder at checkout. Lavo collects a platform fee from each
                    transaction.
                  </>
                ) : (
                  <>
                    Occupants pay Service Provider directly per wash via the Lavo platform.
                    Property Manager incurs no per-wash charge. Lavo collects a platform fee from
                    each Occupant transaction.
                  </>
                )}
              </p>
              <p className="mt-3 text-xs text-ink-400">
                Optional add-ons an Occupant selects at checkout are always paid by that Occupant,
                whatever the arrangement above.
              </p>
              {op?.base_price_cents && (
                <p className="mt-3">
                  <span className="text-ink-400">Standard base price per wash:</span>{' '}
                  <strong className="text-white">
                    {money(op.base_price_cents)}
                  </strong>
                </p>
              )}
            </section>

            {/* Term */}
            <section>
              <h3 className="mb-3 font-display text-lg text-white">4. Term</h3>
              <p>
                This Agreement begins on the effective date and continues on a{' '}
                <strong className="text-white">month-to-month</strong> basis until either party provides
                30 days&rsquo; written notice of termination. There is no minimum term.
              </p>
            </section>

            {/* Insurance */}
            <section>
              <h3 className="mb-3 font-display text-lg text-white">5. Insurance</h3>
              <p>
                Service Provider shall maintain general liability insurance of no less than $1,000,000 per
                occurrence throughout the term of this Agreement.
                {hasApprovedInsurance(op) ? (
                  <span className="ml-1 text-gleam">
                    ✓ Current policy on file, expires {op.insurance_expires_at}.
                  </span>
                ) : (
                  <span className="ml-1 text-ink-400"> Proof of insurance to be provided prior to first service date.</span>
                )}
              </p>
            </section>

            {/* Liability */}
            <section>
              <h3 className="mb-3 font-display text-lg text-white">6. Limitation of Liability</h3>
              <p>
                Service Provider&rsquo;s liability for any single incident is limited to the retail value of
                the service rendered. Property Manager is not liable for vehicles damaged during service.
              </p>
              <p className="mt-3">
                Lavo acts solely as a platform intermediary. It is not a party to the service
                relationship between Property Manager and Service Provider, is not the provider of
                the Services, and does not direct, supervise or control how Service Provider
                performs them.
              </p>
              <p className="mt-3">
                Lavo does not guarantee any volume of bookings, the attendance of Service Provider
                on any date, or the quality of any Services performed, and is not liable to either
                party for any date that is cancelled, missed or unsatisfactorily performed. Lavo is
                not liable for property damage, vehicle damage, personal injury or any other loss
                arising out of the Services, whether claimed by a party to this Agreement, an
                Occupant, or any third party. Service Provider is solely responsible for the
                Services and for the acts of its personnel.
              </p>
              <p className="mt-3">
                Service Provider shall indemnify and hold Lavo harmless from any claim, demand or
                proceeding brought by any person arising out of the Services. Lavo&rsquo;s aggregate
                liability to either party under this Agreement, on any theory, shall not exceed the
                platform fees Lavo actually collected in respect of the Property in the one (1)
                month preceding the event giving rise to the claim, and in no event shall Lavo be
                liable for indirect, incidental or consequential damages. Lavo&rsquo;s sole
                obligation in respect of a cancelled date is to return to the affected Occupants the
                payments it collected for it.
              </p>
            </section>

            {/* Governing law */}
            <section>
              <h3 className="mb-3 font-display text-lg text-white">7. Governing Law</h3>
              <p>
                This Agreement shall be governed by the laws of the State of {governingLaw}, without regard to its conflict of law principles.
              </p>
            </section>

            {/* Signatures */}
            <section id="sign" className="scroll-mt-6 border-t border-white/10 pt-6">
              <h3 className="mb-4 font-display text-lg text-white">Signatures</h3>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <div className="text-xs uppercase tracking-widest text-ink-400 mb-2">Property Manager</div>
                  {contract?.manager_signed_at ? (
                    <div>
                      <div className="font-display text-xl text-gleam italic">{contract.manager_signed_name}</div>
                      <div className="mt-1 text-xs text-ink-400">
                        Signed {new Date(contract.manager_signed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                    </div>
                  ) : (
                    <div className="h-10 border-b border-dashed border-ink-600" />
                  )}
                  <div className="mt-1 text-xs text-ink-400">{managerName} · {building.name}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest text-ink-400 mb-2">Service Provider</div>
                  {contract?.operator_signed_at ? (
                    <div>
                      <div className="font-display text-xl text-gleam italic">{contract.operator_signed_name}</div>
                      <div className="mt-1 text-xs text-ink-400">
                        Signed {new Date(contract.operator_signed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                    </div>
                  ) : (
                    <div className="h-10 border-b border-dashed border-ink-600" />
                  )}
                  <div className="mt-1 text-xs text-ink-400">{op.name}</div>
                </div>
              </div>

              {contract && !isFullyExecuted && contract.status !== 'cancelled' && (
                <ContractDraftSigner
                  contractId={contract.id}
                  buildingName={building.name}
                  alreadySigned={isSigned}
                  nextPending={nextPending}
                />
              )}
            </section>
          </div>
        </div>
      </div>
      )}
    </>
  );
}
