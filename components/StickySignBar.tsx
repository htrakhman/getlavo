/**
 * A bar pinned to the bottom of the viewport pointing at the signature box.
 *
 * A service agreement is several screens of legal text and the place you sign
 * is at the very bottom of it, so on every signing surface the one action the
 * page exists for was the one thing not on screen. The building portal got a
 * version of this first; the operator's copy of the same document had nothing,
 * and its "The building manager has signed. Your signature is next." banner sat
 * at the top as plain text, telling the reader what to do while giving them no
 * way to do it.
 *
 * Presentational and shared so the two portals cannot drift into looking like
 * different products mid-signature.
 */
export function StickySignBar({
  href,
  label,
  detail,
}: {
  /** Anchor or URL the button goes to. */
  href: string;
  /** Button text. */
  label: string;
  /** Optional line above the button. */
  detail?: string | null;
}) {
  return (
    <div className="pointer-events-none sticky bottom-0 z-30 mt-8 pb-4">
      <div className="pointer-events-auto mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-xl border border-gleam/40 bg-ink-900/95 px-4 py-3 shadow-lg backdrop-blur">
        {detail ? (
          <div className="min-w-0 text-sm font-medium text-ink-100">{detail}</div>
        ) : (
          <span />
        )}
        {/* Plain <a>: some callers pass /api/building/select, a Route Handler
            that answers with an HTTP redirect, and next/link's soft navigation
            does not follow one. An in-page #sign anchor works either way. */}
        <a href={href} className="btn-primary shrink-0 whitespace-nowrap">
          {label}
        </a>
      </div>
    </div>
  );
}
