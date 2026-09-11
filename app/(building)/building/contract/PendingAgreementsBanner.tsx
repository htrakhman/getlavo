import type { PendingAgreement } from '@/lib/pending-agreements';

/**
 * Lists the manager's OTHER buildings still waiting on a signature.
 *
 * The contract page can only ever show the selected building's agreement, so
 * without this a manager with three offers signs one and leaves two stranded
 * with no signal they exist. Each row switches the active building and lands
 * back here via the select route's GET redirect, so signing the next one is a
 * single click rather than a hunt through the sidebar switcher.
 *
 * The rows are plain <a> tags, not next/link's <Link>. /api/building/select
 * is a Route Handler that responds with an HTTP redirect, not a page — a
 * <Link> intercepts the click for client-side soft navigation, which doesn't
 * follow that redirect as a real top-level navigation. The click looked like
 * it did nothing: no error, no navigation, no signal anything happened.
 * A plain anchor forces the real browser GET the route's own comment
 * ("switch by link rather than by fetch") assumes it's getting.
 */
export function PendingAgreementsBanner({ others }: { others: PendingAgreement[] }) {
  if (!others.length) return null;

  return (
    <div className="mb-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-5">
      <div className="text-sm font-medium text-amber-600">
        {others.length === 1
          ? '1 more building is waiting on your signature'
          : `${others.length} more buildings are waiting on your signature`}
      </div>
      <p className="mt-1 text-xs text-ink-400">
        Each building is a separate agreement and needs its own signature. Pick one to review and
        sign it next.
      </p>
      <ul className="mt-3 space-y-2">
        {others.map((p) => (
          <li key={p.contractId}>
            <a
              href={`/api/building/select?buildingId=${p.buildingId}&next=/building/contract`}
              className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm hover:border-white/20 hover:bg-white/10"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium text-ink-100">{p.buildingName}</span>
                {p.operatorName && (
                  <span className="block truncate text-xs text-ink-400">from {p.operatorName}</span>
                )}
              </span>
              <span className="shrink-0 text-xs text-amber-600">Review &amp; sign →</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
