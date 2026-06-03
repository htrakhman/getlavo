import Link from 'next/link';
import { Breadcrumbs } from '@/components/marketing/Breadcrumbs';
import { CitiesIndexFilter } from '@/components/marketing/CitiesIndexFilter';
import { ContentPageShell } from '@/components/marketing/ContentPageShell';
import { JsonLd } from '@/components/seo/JsonLd';
import {
  COUNTY_CLUSTER_BLURBS,
  FEATURED_CITY_SLUGS,
  KEEP_COUNTY_SLUGS,
} from '@/lib/seo/keep-cities';
import { getCountiesGrouped, getMunicipalityBySlug } from '@/lib/seo/cities';
import { breadcrumbSchema, serviceSchema } from '@/lib/seo/schema';
import { createPageMetadata } from '@/lib/seo/site';

export const metadata = createPageMetadata({
  path: '/cities',
  title: 'Lavo Cities in New Jersey | Apartment Mobile Car Wash',
  description:
    'Lavo is building apartment based mobile car wash programs across Hudson, Bergen, and Middlesex County, NJ. Find your city, request service at your building, or launch Lavo as a property amenity.',
});

export default function CitiesIndexPage() {
  const counties = getCountiesGrouped().filter((g) =>
    (KEEP_COUNTY_SLUGS as readonly string[]).includes(g.countySlug),
  );

  const filterCounties = counties.map((group) => ({
    county: group.county,
    countySlug: group.countySlug,
    cities: group.municipalities.map((m) => ({
      slug: m.slug,
      localName: m.name,
      county: m.county,
      countySlug: m.countySlug,
    })),
  }));

  const featured = FEATURED_CITY_SLUGS.map((slug) => getMunicipalityBySlug(slug)).filter(Boolean);

  return (
    <ContentPageShell wide>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Cities', path: '/cities' },
          ]),
          serviceSchema({
            path: '/cities',
            name: 'Lavo apartment mobile car wash cities',
            serviceType: 'Mobile car wash for apartment buildings',
            description:
              'Lavo helps New Jersey apartment residents, property managers, and operators with building based mobile car wash programs in Hudson, Bergen, and Middlesex counties.',
            audience: 'Apartment residents, property managers, and operators',
            areaServed: 'New Jersey',
          }),
        ]}
      />
      <Breadcrumbs
        items={[
          { name: 'Home', path: '/' },
          { name: 'Cities', path: '/cities' },
        ]}
      />
      <header className="mb-10">
        <h1 className="font-display text-3xl text-ink-50 sm:text-4xl">Lavo Cities in New Jersey</h1>
        <p className="mt-4 text-base leading-relaxed text-ink-200">
          Lavo focuses on apartment based mobile car wash in Hudson, Bergen, and Middlesex counties,
          helping residents request service at their buildings, property managers add a no cost amenity,
          and operators build local routes.
        </p>
      </header>

      {featured.length > 0 ? (
        <section className="mb-10">
          <h2 className="font-display text-2xl text-ink-100">Featured cities</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {featured.map((m) => (
              <li key={m!.slug}>
                <Link
                  href={`/cities/${m!.slug}`}
                  className="chip inline-block transition-colors hover:border-gleam/40 hover:text-gleam"
                >
                  {m!.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mb-10">
        <h2 className="font-display text-2xl text-ink-100">How Lavo works across New Jersey</h2>
        <p className="mt-4 text-sm leading-relaxed text-ink-300">
          Residents search for their building and book mobile car wash or detailing in an approved garage or
          lot. Property managers offer Lavo as a no cost resident amenity without staff, equipment, or
          construction. Operators serve scheduled building routes instead of scattered one off jobs.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-2xl text-ink-100">Find Lavo by county</h2>
        <div className="mt-6 grid gap-6">
          {counties.map((group) => {
            const blurb =
              COUNTY_CLUSTER_BLURBS[group.countySlug as keyof typeof COUNTY_CLUSTER_BLURBS] ?? '';
            return (
              <div key={group.countySlug} className="card p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-display text-xl text-ink-100">
                      <Link
                        href={`/cities/counties/${group.countySlug}`}
                        className="hover:text-gleam"
                      >
                        {group.county} County
                      </Link>
                    </h3>
                    {blurb ? (
                      <p className="mt-2 text-sm leading-relaxed text-ink-400">{blurb}</p>
                    ) : null}
                  </div>
                  <Link
                    href={`/cities/counties/${group.countySlug}`}
                    className="btn-ghost shrink-0 text-sm py-2"
                  >
                    County overview
                  </Link>
                </div>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {group.municipalities.map((m) => (
                    <li key={m.slug}>
                      <Link
                        href={`/cities/${m.slug}`}
                        className="chip inline-block transition-colors hover:border-gleam/40 hover:text-gleam"
                      >
                        {m.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <div className="mb-10 grid gap-4 sm:grid-cols-2">
        <Link
          href="/cities/new-jersey"
          className="card block p-6 transition-colors hover:border-white/15"
        >
          <h2 className="font-display text-lg text-ink-100">Lavo in New Jersey</h2>
          <p className="mt-2 text-sm text-ink-400">Statewide overview for residents, buildings, and operators.</p>
        </Link>
        <div className="card flex flex-col justify-center gap-3 p-6">
          <Link href="/signup?role=building_manager" className="btn-primary text-center text-sm py-3">
            For property managers
          </Link>
          <Link href="/signup?role=operator" className="btn-ghost text-center text-sm py-3">
            For operators
          </Link>
        </div>
      </div>

      <CitiesIndexFilter counties={filterCounties} />
    </ContentPageShell>
  );
}
