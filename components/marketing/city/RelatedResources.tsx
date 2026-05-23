import Link from 'next/link';

type LinkItem = { href: string; label: string };

type RelatedResourcesProps = {
  title: string;
  links: LinkItem[];
  citySlug: string;
  countySlug: string;
};

export function RelatedResources({ title, links, citySlug, countySlug }: RelatedResourcesProps) {
  return (
    <section className="mb-10">
      <h2 className="font-display text-2xl text-ink-100">{title}</h2>
      <ul className="mt-4 space-y-2 text-sm">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-gleam hover:underline"
              data-cta-type={
                link.href.includes('/counties/') ? 'city_page_county_link_click' : undefined
              }
              data-city={citySlug}
              data-county={countySlug}
              data-page-type="city"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
