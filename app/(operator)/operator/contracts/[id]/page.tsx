import { PageHeader } from '@/components/PortalShell';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { money } from '@/lib/format';
import { OperatorContractSigner } from './OperatorContractSigner';
import { hasApprovedInsurance } from '@/lib/insurance';
import { resolveGoverningLaw } from '@/lib/governing-law';
import { normalizeBillingMode } from '@/lib/billing-arrangement';
import { MINIMUM_CUTOFF_HOURS } from '@/lib/wash-day-minimum';

const BLANK = (label: string) => (
  <span className="inline-block min-w-[120px] border-b border-dashed border-ink-500 text-ink-500 italic px-1">
    {label}
  </span>
);

export default async function OperatorContractPage({ params }: { params: { id: string } }) {
  const session = await getSessionUser();
  if (!session) redirect('/login');

  const sb = supabaseServer();
  const admin = supabaseAdmin();

  // select('*'): naming columns here once bounced operators to onboarding when
  // a named column was missing from the live schema (PostgREST rejects the
  // whole query). '*' only returns columns that exist, so it cannot fail that way.
  const { data: op, error: opError } = await sb
    .from('operators')
    .select('*')
    .eq('owner_id', session.user.id)
    .maybeSingle();
  if (opError) console.error('operator contract: operator query failed:', opError.message);
  if (!op) redirect('/operator/onboarding');

  const { data: contract } = await admin
    .from('contracts')
    .select('*')
    .eq('id', params.id)
    .eq('operator_id', op.id)
    .maybeSingle();
  if (!contract) redirect('/operator/contracts');

  const { data: building } = await admin
    .from('buildings')
    .select('id, name, address_line1, city, region, postal_code, wash_day, preferred_wash_day, profiles!manager_id(full_name, email)')
    .eq('id', contract.building_id)
    .maybeSingle();

  const [{ data: packages }, { data: addons }] = await Promise.all([
    sb.from('service_packages').select('name, description, price_cents').eq('operator_id', op.id).eq('active', true).order('display_order'),
    sb.from('operator_addons').select('label, price_cents').eq('operator_id', op.id).eq('active', true),
  ]);

  const managerProfile = (building?.profiles as any) ?? null;
  const managerName = managerProfile?.full_name || managerProfile?.email || '—';
  const address = building
    ? `${building.address_line1}, ${building.city}, ${building.region} ${building.postal_code}`
    : null;
  const governingLaw = resolveGoverningLaw(building?.region, contract.governing_law);
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const minBookings = Math.max(0, op?.min_bookings_per_day ?? 0);
  const billingMode = normalizeBillingMode(contract.billing_mode);
  const propertySubsidyCents = Math.max(0, contract.property_subsidy_cents ?? 0);
  const managerSigned = !!contract.manager_signed_at;
  const operatorSigned = !!contract.operator_signed_at;
  const isFullyExecuted = contract.status === 'executed' || (managerSigned && operatorSigned);

  return (
    <>
      <PageHeader eyebrow={building?.name ?? 'Contract'} title="Service agreement" />

      {isFullyExecuted && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-gleam/30 bg-gleam/10 px-5 py-3">
          <span className="text-gleam text-lg">✓</span>
          <div>
            <div className="text-sm font-medium text-gleam">Agreement fully executed</div>
            <div className="text-xs text-ink-400">
              Signed by both parties · {contract.fully_executed_at?.slice(0, 10) || contract.operator_signed_at?.slice(0, 10)}
            </div>
          </div>
          <a href={`/api/contracts/${contract.id}/pdf`} className="btn-quiet ml-auto text-xs" target="_blank" rel="noreferrer">
            Download PDF
          </a>
        </div>
      )}

      {!isFullyExecuted && (
        <div className="mb-6 flex justify-end">
          <a href={`/api/contracts/${contract.id}/pdf`} className="btn-quiet text-xs" target="_blank" rel="noreferrer">
            Download agreement (PDF) →
          </a>
        </div>
      )}

      {operatorSigned && !managerSigned && !isFullyExecuted && (
        <div className="mb-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-5 py-3 text-sm text-amber-600">
          You've signed. Awaiting the property manager's signature.
        </div>
      )}

      {managerSigned && !operatorSigned && !isFullyExecuted && (
        <div className="mb-6 rounded-xl border border-gleam/30 bg-gleam/10 px-5 py-3 text-sm text-gleam">
          The building manager has signed. Your signature is next.
        </div>
      )}

      <div className="mx-auto max-w-3xl">
        <div className="legal-doc rounded-2xl border border-slate-300 shadow-sm">
          {/* Header */}
          <div className="border-b border-white/10 px-10 py-8 text-center">
            <div className="text-xs uppercase tracking-[0.25em] text-gleam">Lavo</div>
            <h2 className="mt-2 font-display text-3xl">Car Wash Service Agreement</h2>
            <p className="mt-2 text-sm text-ink-400">
              Effective date: {managerSigned ? contract.manager_signed_at?.slice(0, 10) : today}
            </p>
          </div>

          <div className="space-y-8 px-10 py-8 text-sm leading-relaxed text-ink-200">

            {/* Parties */}
            <section>
              <h3 className="mb-3 font-display text-lg text-white">1. Parties</h3>
              <p>This Service Agreement (&ldquo;Agreement&rdquo;) is entered into between:</p>
              <p className="mt-3 text-xs text-ink-400">
                &ldquo;Property&rdquo; means the building, buildings or premises identified below,
                whether residential or commercial. &ldquo;Occupants&rdquo; means the residents and
                tenants of the Property, and the employees, staff and authorized visitors of those
                tenants, who book Services under this Agreement. A tenant that is a business books
                through the individuals it authorizes.
              </p>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl bg-white/5 p-4">
                  <div className="mb-2 text-xs uppercase tracking-widest text-ink-400">Property Manager</div>
                  <div className="font-medium text-white">{managerName}</div>
                  <div className="mt-1 text-ink-300">{building?.name ?? '—'}</div>
                  <div className="mt-0.5 text-xs text-ink-400">{address ?? '—'}</div>
                  {managerProfile?.email && <div className="mt-0.5 text-xs text-ink-400">{managerProfile.email}</div>}
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
                <strong className="text-white">{building?.name ?? BLANK('property name')}</strong>,{' '}
                {address ?? BLANK('property address')}.
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

              {packages && packages.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-ink-400">Service packages:</p>
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

              {addons && addons.length > 0 && (
                <div className="mt-3">
                  <p className="mb-2 text-ink-400">Optional add-ons:</p>
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
              {/* Must state the same arrangement the manager sees on their copy
                  of this contract — one agreement cannot describe two different
                  deals depending on who opens it. */}
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
              {op.base_price_cents && (
                <p className="mt-3">
                  <span className="text-ink-400">Standard base price per wash:</span>{' '}
                  <strong className="text-white">{money(op.base_price_cents)}</strong>
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
                Lavo acts as platform intermediary and is not a party to the service relationship.
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
            <section className="border-t border-white/10 pt-6">
              <h3 className="mb-4 font-display text-lg text-white">Signatures</h3>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <div className="text-xs uppercase tracking-widest text-ink-400 mb-2">Property Manager</div>
                  {contract.manager_signed_at ? (
                    <div>
                      <div className="font-display text-xl text-gleam italic">{contract.manager_signed_name}</div>
                      <div className="mt-1 text-xs text-ink-400">
                        Signed {new Date(contract.manager_signed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                    </div>
                  ) : (
                    <div className="h-10 border-b border-dashed border-ink-600" />
                  )}
                  <div className="mt-1 text-xs text-ink-400">{managerName} · {building?.name}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest text-ink-400 mb-2">Service Provider</div>
                  {contract.operator_signed_at ? (
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

              {!isFullyExecuted && (
                <OperatorContractSigner
                  contractId={contract.id}
                  operatorName={op.name}
                  alreadySigned={operatorSigned}
                />
              )}
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
