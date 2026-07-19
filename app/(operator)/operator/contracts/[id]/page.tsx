import { PageHeader } from '@/components/PortalShell';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { money } from '@/lib/format';
import { OperatorContractSigner } from './OperatorContractSigner';

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
  const washDay = building?.wash_day || building?.preferred_wash_day || contract.service_day || null;
  const governingLaw = building?.region || contract.governing_law || 'Delaware';
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

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
          {contract.pdf_url && (
            <a href={contract.pdf_url} className="btn-quiet ml-auto text-xs" target="_blank" rel="noreferrer">
              Download PDF
            </a>
          )}
        </div>
      )}

      {operatorSigned && !managerSigned && !isFullyExecuted && (
        <div className="mb-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-5 py-3 text-sm text-amber-600">
          You've signed. Awaiting the building manager's signature.
        </div>
      )}

      {managerSigned && !operatorSigned && !isFullyExecuted && (
        <div className="mb-6 rounded-xl border border-gleam/30 bg-gleam/10 px-5 py-3 text-sm text-gleam">
          The building manager has signed. Your signature is next.
        </div>
      )}

      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-white/10 bg-ink-900 shadow-xl">
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
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl bg-white/5 p-4">
                  <div className="mb-2 text-xs uppercase tracking-widest text-ink-400">Building Manager</div>
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
                Service Provider agrees to provide car wash services (&ldquo;Services&rdquo;) at{' '}
                <strong className="text-white">{building?.name ?? BLANK('building name')}</strong>,{' '}
                {address ?? BLANK('building address')}.
              </p>
              <ul className="mt-3 space-y-2 pl-4">
                <li>
                  <span className="text-ink-400">Scheduled wash day:</span>{' '}
                  <strong className="text-white">{washDay ?? BLANK('day of week')}</strong>
                </li>
                <li>
                  <span className="text-ink-400">Frequency:</span>{' '}
                  <strong className="text-white">Weekly (or as agreed per scheduling tool)</strong>
                </li>
                <li>
                  <span className="text-ink-400">Service location:</span>{' '}
                  <strong className="text-white">Building parking garage / designated wash area</strong>
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
              <p>
                Residents pay Service Provider directly per wash via the Lavo platform. The building manager
                incurs no per-wash charge. Lavo collects a platform fee from each resident transaction.
              </p>
              {op.base_price_cents && (
                <p className="mt-3">
                  <span className="text-ink-400">Standard base price per resident wash:</span>{' '}
                  <strong className="text-white">{money(op.base_price_cents)}</strong>
                </p>
              )}
            </section>

            {/* Term */}
            <section>
              <h3 className="mb-3 font-display text-lg text-white">4. Term</h3>
              <p>
                This Agreement begins on the effective date and continues for an initial pilot period of{' '}
                <strong className="text-white">90 days</strong>, after which it renews automatically on a
                month-to-month basis unless either party provides 30 days&rsquo; written notice of termination.
              </p>
            </section>

            {/* Insurance */}
            <section>
              <h3 className="mb-3 font-display text-lg text-white">5. Insurance</h3>
              <p>
                Service Provider shall maintain general liability insurance of no less than $1,000,000 per
                occurrence throughout the term of this Agreement.
                {op.insurance_expires_at ? (
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
                the service rendered. Building Manager is not liable for vehicles damaged during service.
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
                  <div className="text-xs uppercase tracking-widest text-ink-400 mb-2">Building Manager</div>
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
