import Link from 'next/link';
import { CitiesIndexFilter } from '@/components/marketing/CitiesIndexFilter';
import { ContentPageShell } from '@/components/marketing/ContentPageShell';
import { JsonLd } from '@/components/seo/JsonLd';
import { getCountiesGrouped } from '@/lib/seo/cities';
import { getCountyProfile } from '@/lib/seo/cities/county-profiles';
import { breadcrumbSchema, serviceSchema } from '@/lib/seo/schema';
import { createPageMetadata } from '@/lib/seo/site';

export const metadata = createPageMetadata({
  path: '/cities',
  title: 'Lavo Cities in New Jersey | Apartment Mobile Car Wash',
  description:
    'Lavo is building apartment based mobile car wash programs across New Jersey. Find your city, request service at your building, or launch Lavo as a property amenity.',
});

export default function CitiesIndexPage() {
  const counties = getCountiesGrouped();

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
              'Lavo helps New Jersey apartment residents, property managers, and operators with building based mobile car wash programs.',
            audience: 'Apartment residents, property managers, and operators',
            areaServed: 'New Jersey',
          }),
        ]}
      />
      <header className="mb-10">
        <h1 className="font-display text-3xl text-ink-50 sm:text-4xl">Lavo Cities in New Jersey</h1>
        <p className="mt-4 text-base leading-relaxed text-ink-200">
          Lavo is building apartment based mobile car wash programs across New Jersey, helping residents
          request service at their buildings, property managers add a no cost amenity, and operators build
          local routes.
        </p>
      </header>

      <section className="mb-10">
        <h2 className="font-display text-2xl text-ink-100">How Lavo works across New Jersey</h2>
        <p className="mt-4 text-sm leading-relaxed text-ink-300">
          Residents search for their building and book mobile car wash or detailing in an approved garage or
          lot. Property managers offer Lavo as a no cost resident amenity without staff, equipment, or
          construction. Operators serve scheduled building routes instead of scattered one off jobs.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-2xl text-ink-100">Why apartment buildings use Lavo</h2>
        <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-ink-300">
          <li>Resident convenience at the building garage or parking area</li>
          <li>No cost amenity for property managers</li>
          <li>Clear rules instead of random outside detailers</li>
          <li>Operators can build denser local routes</li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-2xl text-ink-100">Find Lavo by county</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {counties.map((group) => {
            const profile = getCountyProfile(group.countySlug);
            const top = group.municipalities.slice(0, 3).map((m) => m.name);
            return (
              <Link
                key={group.countySlug}
                href={`/cities/counties/${group.countySlug}`}
                className="card block p-5 transition-colors hover:border-white/15"
              >
                <h3 className="font-display text-lg text-ink-100">{group.county} County</h3>
                <p className="mt-2 text-sm text-ink-400">
                  {group.municipalities.length} municipalities · {profile.region}
                </p>
                {top.length > 0 ? (
                  <p className="mt-2 text-xs text-ink-500">
                    Includes {top.join(', ')}
                    {group.municipalities.length > 3 ? ', and more' : ''}
                  </p>
                ) : null}
              </Link>
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
