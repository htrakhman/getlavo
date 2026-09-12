import type { PendingAgreement } from '@/lib/pending-agreements';

/**
 * A persistent bar pinned to the bottom of the viewport while this manager
 * still has agreements to sign.
 *
 * The agreement is a long legal document, and both of the things a signer
 * needs sit at the very bottom of it: the signature box, and the link to the
 * next building. So every step cost a full-page scroll — down to sign, and on
 * a multi-building account, back up and around to reach the next one. There
 * was already an inline "Next agreement" card, but it is only reachable once
 * you have scrolled to it, which is precisely the problem, and it was styled
 * as a tinted info panel with 12px text rather than as a button.
 *
 * This is scroll-independent instead: wherever the signer is in the document,
 * the next action is on screen and is a real button.
 *
 * It answers whichever question is live. Unsigned here → jump to the signature
 * box on this page. Signed here with others outstanding → switch to the next
 * building. Nothing outstanding → the bar does not render at all, so a manager
 * who is done is not followed around by a banner.
 */
export function NextAgreementBar({
  pending,
  currentBuildingId,
  signedHere,
}: {
  pending: PendingAgreement[];
  currentBuildingId: string;
  signedHere: boolean;
}) {
  const others = pending.filter((p) => p.buildingId !== currentBuildingId);
  const needsSignatureHere = !signedHere && pending.some((p) => p.buildingId === currentBuildingId);

  if (!needsSignatureHere && !others.length) return null;

  const remaining = (needsSignatureHere ? 1 : 0) + others.length;
  const next = others[0] ?? null;

  // Sign here first when this one is unsigned — sending a signer to another
  // building while the open document in front of them is unsigned is how an
  // agreement gets skipped.
  const href = needsSignatureHere
    ? '#sign'
    : `/api/building/select?buildingId=${next!.buildingId}&next=${encodeURIComponent('/building/contract#sign')}`;

  const label = needsSignatureHere ? 'Sign this agreement ↓' : `Next: ${next!.buildingName} →`;

  return (
    <div className="pointer-events-none sticky bottom-0 z-30 mt-8 pb-4">
      <div className="pointer-events-auto mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-xl border border-gleam/40 bg-ink-900/95 px-4 py-3 shadow-lg backdrop-blur">
        <div className="min-w-0">
          <div className="text-sm font-medium text-ink-100">
            {remaining === 1
              ? '1 agreement still needs your signature'
              : `${remaining} agreements still need your signature`}
          </div>
          {!needsSignatureHere && next?.operatorName && (
            <div className="truncate text-xs text-ink-400">from {next.operatorName}</div>
          )}
        </div>
        {/* Plain <a>: /api/building/select answers with an HTTP redirect and
            next/link's soft navigation does not follow one. */}
        <a href={href} className="btn-primary shrink-0 whitespace-nowrap">
          {label}
        </a>
      </div>
    </div>
  );
}
