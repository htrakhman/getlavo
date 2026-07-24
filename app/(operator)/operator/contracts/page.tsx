import { PageHeader } from '@/components/PortalShell';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { getAvailableBuildingsForOperator } from '@/lib/operator-available-buildings';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { SendContractPanel } from './SendContractPanel';
import { AgreementBuilder } from './AgreementBuilder';
import { hasApprovedInsurance } from '@/lib/insurance';

const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function openWashDays(hours: any): string[] {
  if (!hours || typeof hours !== 'object') return [];
  return DAY_ORDER.filter((d) => hours[d] && hours[d].closed !== true);
}

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  pending_signatures: 'Pending signatures',
  executed: 'Executed',
  terminated: 'Terminated',
  cancelled: 'Cancelled',
};

const STATUS_COLOR: Record<string, string> = {
  draft: 'text-ink-400',
  pending_signatures: 'text-amber-600',
  executed: 'text-gleam',
  terminated: 'text-red-400',
  cancelled: 'text-red-400',
};

export default async function OperatorContractsPage() {
  const session = await getSessionUser();
  if (!session) redirect('/login');

  const sb = supabaseServer();
  const { data: op } = await sb
    .from('operators')
    .select('*')
    .eq('owner_id', session.user.id)
    .maybeSingle();
  if (!op) redirect('/operator/onboarding');

  const [{ data: contracts }, { data: packages }, availableData] = await Promise.all([
    sb
      .from('contracts')
      .select('id, status, created_at, manager_signed_at, operator_signed_at, fully_executed_at, building:buildings(id, name, address_line1, city, region)')
      .eq('operator_id', op.id)
      .order('created_at', { ascending: false }),
    sb.from('service_packages').select('id, name, description, price_cents').eq('operator_id', op.id).eq('active', true).order('display_order'),
    getAvailableBuildingsForOperator(op.id),
  ]);

  // Required fields the agreement needs before it can be sent to a building.
  const washDays = openWashDays(op.hours_json);
  const requirements = [
    { key: 'name', label: 'Business name', done: !!op.name },
    { key: 'schedule', label: 'Wash days & hours', done: washDays.length > 0 },
    { key: 'price', label: 'Base price per wash', done: (op.base_price_cents ?? 0) > 0 },
    { key: 'packages', label: 'At least one service package', done: (packages?.length ?? 0) > 0 },
  ];
  const missing = requirements.filter((r) => !r.done);
  const canSend = missing.length === 0;

  const initial = {
    operatorId: op.id,
    name: op.name ?? '',
    contactEmail: op.contact_email || session.profile.email || null,
    contactPhone: op.contact_phone ?? '',
    basePriceCents: op.base_price_cents ?? null,
    hoursJson: op.hours_json ?? null,
    washDays,
    packages: (packages ?? []).map((p: any) => ({ id: p.id, name: p.name, description: p.description ?? '', price_cents: p.price_cents })),
    insuranceApproved: hasApprovedInsurance(op),
    insuranceOnFile: !!op.insurance_doc_url,
  };

  const executed = (contracts ?? []).find((c: any) => c.status === 'executed');
  const pending = (contracts ?? []).find((c: any) => c.status === 'pending_signatures');

  // Don't offer buildings the operator already has a live agreement with.
  const contractedBuildingIds = new Set(
    (contracts ?? [])
      .filter((c: any) => c.status === 'executed' || c.status === 'pending_signatures' || c.status === 'draft')
      .map((c: any) => c.building?.id)
      .filter(Boolean),
  );
  const offerableBuildings = availableData.available.filter((b) => !contractedBuildingIds.has(b.id));

  return (
    <>
      <PageHeader eyebrow={op.name} title="Service agreements" />

      <AgreementBuilder initial={initial} pdfHref="/api/operator/agreement-preview" />

      {/* Current agreement status */}
      {executed ? (
        <div className="mb-8 flex items-center gap-3 rounded-xl border border-gleam/30 bg-gleam/10 px-5 py-3">
          <span className="text-gleam text-lg">✓</span>
          <div>
            <div className="text-sm font-medium text-gleam">
              Current agreement active — {(executed as any).building?.name}
            </div>
            <div className="text-xs text-ink-400">
              Fully executed{' '}
              {(executed as any).fully_executed_at?.slice(0, 10) ??
                (executed as any).operator_signed_at?.slice(0, 10) ??
                ''}
            </div>
          </div>
        </div>
      ) : pending ? (
        <div className="mb-8 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-5 py-3 text-sm text-amber-600">
          No executed agreement yet — one with {(pending as any).building?.name} is awaiting signatures.
        </div>
      ) : (
        <div className="mb-8 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-ink-300">
          No current agreement. Send one to an available building below — the property manager gets an
          email asking if they&rsquo;d like you as their washer.
        </div>
      )}

      {!contracts?.length ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-ink-400">
            No contracts yet. Send an agreement to a building below, or one appears here when a
            building manager initiates it.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {contracts.map((c: any) => {
            const building = c.building;
            const needsYourSig = c.status !== 'executed' && !c.operator_signed_at;
            return (
              <Link
                key={c.id}
                href={`/operator/contracts/${c.id}`}
                className="card block p-5 hover:border-white/20 transition"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium text-white">{building?.name ?? '—'}</div>
                    <div className="mt-0.5 text-xs text-ink-400">
                      {building?.city}, {building?.region} · Created {c.created_at?.slice(0, 10)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-sm font-medium ${STATUS_COLOR[c.status] ?? 'text-ink-300'}`}>
                      {STATUS_LABEL[c.status] ?? c.status}
                    </div>
                    {needsYourSig && (
                      <div className="mt-0.5 text-xs text-amber-600">Needs your signature →</div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <section className="mt-10">
        <h2 className="mb-1 font-display text-xl">Available buildings</h2>
        <p className="mb-4 text-sm text-ink-400">
          Buildings without an operator. Send a service agreement — the building manager is emailed at
          the address they signed up with, asking whether they&rsquo;d like you as their washer.
        </p>
        <SendContractPanel
          buildings={offerableBuildings}
          canSend={canSend}
          missingLabels={missing.map((m) => m.label)}
        />
      </section>
    </>
  );
}
