import type { PendingAgreement } from '@/lib/pending-agreements';

/**
 * Every building with an agreement still waiting on the manager's signature —
 * a flat list, current building included.
 *
 * The contract page can only ever render one building's agreement at a time,
 * so without this list a manager who signs the one they landed on has no
 * signal the others exist. Listing the current building too (rather than
 * splitting it out as "the one below" vs. "the others up here") keeps this
 * one honest answer to one question: which buildings need me to sign.
 *
 * A row for the CURRENT building jumps straight to the signature section on
 * this same page — no need to round-trip through the building-switch route
 * for a building that's already selected. Every other row is a plain <a> (not
 * next/link's <Link>): /api/building/select is a Route Handler that responds
 * with an HTTP redirect, not a page, and <Link> intercepts the click for
 * client-side soft navigation that never follows that redirect as a real
 * top-level navigation — the earlier version of this component learned that
 * the hard way. Both kinds of row carry #sign, so landing on a different
 * building's contract page scrolls straight to its Signatures section instead
 * of leaving the signer to find it at the bottom of the legal text.
 */
export function PendingAgreementsBanner({
  pending,
  currentBuildingId,
}: {
  pending: PendingAgreement[];
  currentBuildingId: string;
}) {
  if (!pending.length) return null;

  return (
    <div className="mb-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-5">
      <div className="text-sm font-medium text-amber-600">
        {pending.length === 1
          ? '1 building needs your signature'
          : `${pending.length} buildings need your signature`}
      </div>
      <p className="mt-1 text-xs text-ink-400">
        Each building is a separate agreement and needs its own signature.
      </p>
      <ul className="mt-3 space-y-2">
        {pending.map((p) => {
          const isCurrent = p.buildingId === currentBuildingId;
          return (
            <li key={p.contractId}>
              <a
                href={isCurrent ? '#sign' : `/api/building/select?buildingId=${p.buildingId}&next=${encodeURIComponent('/building/contract#sign')}`}
                className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm hover:border-white/20 hover:bg-white/10"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-ink-100">
                    {p.buildingName}
                    {isCurrent && <span className="ml-2 text-xs font-normal text-ink-400">(this building)</span>}
                  </span>
                  {p.operatorName && (
                    <span className="block truncate text-xs text-ink-400">from {p.operatorName}</span>
                  )}
                </span>
                <span className="shrink-0 text-xs text-amber-600">
                  {isCurrent ? 'Sign below ↓' : 'Review & sign →'}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
