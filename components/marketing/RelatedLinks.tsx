import Link from 'next/link';

export type RelatedLink = { href: string; label: string };

const DEFAULT_RESOURCE_LINKS: RelatedLink[] = [
  { href: '/buildings', label: 'For properties' },
  { href: '/operators', label: 'For operators' },
  { href: '/residents', label: 'For residents' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/safety', label: 'Safety' },
  { href: '/cities/new-jersey', label: 'New Jersey' },
];

type RelatedLinksProps = {
  links?: RelatedLink[];
  title?: string;
};

export function RelatedLinks({
  links,
  title = 'Related pages',
}: RelatedLinksProps) {
  const items = links ?? DEFAULT_RESOURCE_LINKS;

  return (
    <nav className="mb-10 border-t border-white/10 pt-8" aria-label={title}>
      <h2 className="text-xs font-medium uppercase tracking-widest text-ink-500">{title}</h2>
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
        {items.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-gleam hover:underline">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function mergeRelatedLinks(extra?: RelatedLink[]): RelatedLink[] {
  const seen = new Set<string>();
  const merged: RelatedLink[] = [];
  for (const link of [...(extra ?? []), ...DEFAULT_RESOURCE_LINKS]) {
    if (seen.has(link.href)) continue;
    seen.add(link.href);
    merged.push(link);
  }
  return merged;
}
