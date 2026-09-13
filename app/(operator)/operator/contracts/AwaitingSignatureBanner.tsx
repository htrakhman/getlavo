import Link from 'next/link';
import type { AwaitingSignature } from '@/lib/operator-signatures';

/**
 * Agreements the property has signed and the operator has not, at the very top
 * of the page.
 *
 * The rows already existed further down, correctly badged "Needs your
 * signature". They sat below AgreementBuilder, which renders a complete copy of
 * the service agreement, so reaching them meant scrolling past an entire legal
 * document — and the first thing on the page instead read "Your agreement is
 * ready to send ✓", which is about a different task and reads like there is
 * nothing outstanding.
 *
 * This is the one thing the operator has to do, so it goes first.
 */
export function AwaitingSignatureBanner({ awaiting }: { awaiting: AwaitingSignature[] }) {
  if (!awaiting.length) return null;

  return (
    <section
      className="mb-8 rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-5"
      aria-label="Agreements awaiting your signature"
    >
      <div className="flex items-center gap-2">
        <span aria-hidden className="inline-block h-2 w-2 shrink-0 rounded-full bg-red-500" />
        <h2 className="text-sm font-medium text-amber-600">
          {awaiting.length === 1
            ? 'The property has signed. Your signature is the last step.'
            : `${awaiting.length} properties have signed. Your signature is the last step.`}
        </h2>
      </div>
      <p className="mt-1 text-xs text-ink-400">
        Nothing can be booked until each agreement is signed by both sides.
      </p>

      <ul className="mt-3 space-y-2">
        {awaiting.map((a) => (
          <li key={a.contractId}>
            <Link
              href={`/operator/contracts/${a.contractId}`}
              className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm transition hover:border-white/20 hover:bg-white/10"
            >
              <span className="min-w-0 truncate font-medium text-ink-100">
                {a.buildingName ?? 'Agreement'}
              </span>
              <span className="shrink-0 text-xs font-medium text-amber-600">Review &amp; sign →</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
