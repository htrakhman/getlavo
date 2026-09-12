import type { AttentionItem } from '@/lib/building-attention';

/**
 * The "what is wrong" panel. The red dot in the nav says only that something
 * needs doing; this says what, and is a link straight to it.
 *
 * Rows for another building are plain <a>, not next/link's <Link>:
 * /api/building/select is a Route Handler that answers with an HTTP redirect,
 * and <Link>'s soft navigation does not follow one — clicking it did nothing
 * at all. Same lesson as PendingAgreementsBanner.
 */
export function AttentionPanel({
  items,
  className = '',
}: {
  items: AttentionItem[];
  className?: string;
}) {
  if (!items.length) return null;

  return (
    <section
      className={`rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-5 ${className}`}
      aria-label="Needs your attention"
    >
      <div className="flex items-center gap-2">
        <span aria-hidden className="inline-block h-2 w-2 shrink-0 rounded-full bg-red-500" />
        <h2 className="text-sm font-medium text-amber-600">
          {items.length === 1 ? '1 thing needs your attention' : `${items.length} things need your attention`}
        </h2>
      </div>

      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.key}>
            <a
              href={item.href}
              className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm transition hover:border-white/20 hover:bg-white/10"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium text-ink-100">
                  {item.label}
                  {item.otherBuilding && (
                    <span className="ml-2 text-xs font-normal text-ink-400">(other building)</span>
                  )}
                </span>
                <span className="block text-xs text-ink-400">{item.detail}</span>
              </span>
              <span className="shrink-0 text-xs text-amber-600">Fix →</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
