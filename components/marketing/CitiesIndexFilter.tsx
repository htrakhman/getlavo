'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

export type CityIndexEntry = {
  slug: string;
  localName: string;
  county: string;
  countySlug: string;
};

export type CountyGroup = {
  county: string;
  countySlug: string;
  cities: CityIndexEntry[];
};

type CitiesIndexFilterProps = {
  counties: CountyGroup[];
};

export function CitiesIndexFilter({ counties }: CitiesIndexFilterProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return counties;

    return counties
      .map((group) => ({
        ...group,
        cities: group.cities.filter(
          (c) =>
            c.localName.toLowerCase().includes(q) ||
            c.county.toLowerCase().includes(q) ||
            c.slug.includes(q),
        ),
      }))
      .filter((group) => group.cities.length > 0);
  }, [counties, query]);

  const totalShown = filtered.reduce((n, g) => n + g.cities.length, 0);

  return (
    <div>
      <label htmlFor="city-filter" className="sr-only">
        Filter municipalities
      </label>
      <input
        id="city-filter"
        type="search"
        placeholder="Filter by municipality or county…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-8 w-full max-w-md rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-ink-100 placeholder:text-ink-500 focus:border-white/20 focus:outline-none"
      />
      <p className="mb-6 text-sm text-ink-400">
        {totalShown} {totalShown === 1 ? 'municipality' : 'municipalities'}
        {query ? ` matching “${query.trim()}”` : ' across New Jersey'}
      </p>
      <div className="space-y-10">
        {filtered.map((group) => (
          <section key={group.countySlug} id={group.countySlug}>
            <h2 className="font-display text-xl text-ink-100">
              <Link
                href={`/cities/counties/${group.countySlug}`}
                className="hover:text-gleam transition-colors"
              >
                {group.county} County
              </Link>
            </h2>
            <ul className="mt-4 columns-1 gap-x-8 sm:columns-2 lg:columns-3">
              {group.cities.map((city) => (
                <li key={city.slug} className="mb-2 break-inside-avoid">
                  <Link
                    href={`/cities/${city.slug}`}
                    className="text-sm text-gleam hover:underline"
                  >
                    {city.localName}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
