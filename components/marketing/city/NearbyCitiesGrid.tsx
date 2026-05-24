import Link from 'next/link';

type NearbyCitiesGridProps = {
  title: string;
  cities: { slug: string; name: string }[];
  countySlug: string;
};

export function NearbyCitiesGrid({ title, cities, countySlug }: NearbyCitiesGridProps) {
  if (!cities.length) return null;
  return (
    <section className="mb-10">
      <h2 className="font-display text-2xl text-ink-100">{title}</h2>
      <ul className="mt-4 flex flex-wrap gap-2">
        {cities.map((c) => (
          <li key={c.slug}>
            <Link
              href={`/cities/${c.slug}`}
              className="chip inline-block transition-colors hover:border-gleam/40 hover:text-gleam"
              data-cta-type="city_page_nearby_city_click"
              data-city={c.slug}
              data-county={countySlug}
              data-page-type="city"
            >
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
