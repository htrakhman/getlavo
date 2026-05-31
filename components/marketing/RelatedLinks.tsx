import Link from 'next/link';

export type RelatedLink = { href: string; label: string };

export type RelatedLinkGroup = {
  title: string;
  links: RelatedLink[];
};

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
  groups?: RelatedLinkGroup[];
  title?: string;
};

function groupRelatedLinks(links: RelatedLink[]): RelatedLinkGroup[] {
  const platform: RelatedLink[] = [];
  const company: RelatedLink[] = [];
  const guides: RelatedLink[] = [];
  const locations: RelatedLink[] = [];

  for (const link of links) {
    const { href } = link;
    if (href.startsWith('/resources/')) {
      guides.push(link);
    } else if (href.startsWith('/cities') || href.startsWith('/counties')) {
      locations.push(link);
    } else if (
      href === '/buildings' ||
      href === '/operators' ||
      href === '/residents' ||
      href === '/how-it-works'
    ) {
      platform.push(link);
    } else {
      company.push(link);
    }
  }

  const groups: RelatedLinkGroup[] = [];
  if (platform.length) groups.push({ title: 'Platform', links: platform });
  if (company.length) groups.push({ title: 'Company', links: company });
  if (guides.length) groups.push({ title: 'Guides', links: guides });
  if (locations.length) groups.push({ title: 'Cities', links: locations });
  return groups;
}

function LinkList({ links }: { links: RelatedLink[] }) {
  return (
    <ul className="space-y-2.5">
      {links.map((link) => (
        <li key={link.href}>
          <Link
            href={link.href}
            className="text-sm text-ink-300 transition-colors hover:text-gleam"
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function RelatedLinks({
  links,
  groups: groupsProp,
  title = 'Related pages',
}: RelatedLinksProps) {
  const flatLinks = links ?? DEFAULT_RESOURCE_LINKS;
  const groups =
    groupsProp ?? (flatLinks.length >= 8 ? groupRelatedLinks(flatLinks) : null);

  return (
    <nav className="mb-10 border-t border-white/10 pt-10" aria-label={title}>
      <h2 className="text-xs font-medium uppercase tracking-widest text-ink-500">{title}</h2>

      {groups ? (
        <div className="mt-6 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {groups.map((group) => (
            <div key={group.title}>
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-ink-400">
                {group.title}
              </h3>
              <LinkList links={group.links} />
            </div>
          ))}
        </div>
      ) : (
        <ul className="mt-4 grid gap-x-8 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {flatLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-sm text-ink-300 transition-colors hover:text-gleam"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
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
