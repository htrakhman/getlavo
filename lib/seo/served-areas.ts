/**
 * Served areas for the sitewide LocalBusiness `areaServed`, derived from
 * Supabase rather than a hand-maintained list.
 *
 * The rule this file exists to enforce: when a building in a new city goes
 * live, the sitewide schema starts claiming that city on the next revalidation
 * with no code change. Nothing here hardcodes a city, county, or state.
 *
 * Rows go through the same `lib/seo/public-data` guard every other indexable
 * surface uses — QA fixtures share the production database and carry real
 * statuses, so a raw status filter would leak "QA Test Towers" into the
 * schema of every page on the site.
 */
import { unstable_cache } from 'next/cache';
import { NJ_MUNICIPALITIES } from '@/lib/seo/cities/nj-municipalities';
import { filterPublicEntities } from '@/lib/seo/public-data';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * Statuses that count as coverage.
 *
 * Deliberately narrower than `PUBLIC_BUILDING_STATUSES`, which includes
 * `prospect`. A prospect is a lead the sales side is working, not a place a
 * resident can book a wash — naming one in `areaServed` claims service Lavo
 * cannot deliver. City page copy can reasonably mention prospects; the
 * sitewide business schema cannot.
 */
const SERVED_AREA_STATUSES = ['active', 'pilot'] as const;

export type ServedArea = {
  /** Display name, e.g. "Jersey City". */
  city: string;
  /** Two-letter code, e.g. "NJ". */
  state: string;
  /** County name without the "County" suffix, when unambiguous. */
  county?: string;
};

/** Revalidate tag — call `revalidateTag(SERVED_AREAS_TAG)` when a building goes live. */
export const SERVED_AREAS_TAG = 'seo:served-areas';

/** How long a served-area snapshot may go stale before it is refetched. */
const SERVED_AREAS_TTL_SECONDS = 3600;

const STATE_CODES: Record<string, string> = {
  alabama: 'AL',
  alaska: 'AK',
  arizona: 'AZ',
  arkansas: 'AR',
  california: 'CA',
  colorado: 'CO',
  connecticut: 'CT',
  delaware: 'DE',
  'district of columbia': 'DC',
  florida: 'FL',
  georgia: 'GA',
  hawaii: 'HI',
  idaho: 'ID',
  illinois: 'IL',
  indiana: 'IN',
  iowa: 'IA',
  kansas: 'KS',
  kentucky: 'KY',
  louisiana: 'LA',
  maine: 'ME',
  maryland: 'MD',
  massachusetts: 'MA',
  michigan: 'MI',
  minnesota: 'MN',
  mississippi: 'MS',
  missouri: 'MO',
  montana: 'MT',
  nebraska: 'NE',
  nevada: 'NV',
  'new hampshire': 'NH',
  'new jersey': 'NJ',
  'new mexico': 'NM',
  'new york': 'NY',
  'north carolina': 'NC',
  'north dakota': 'ND',
  ohio: 'OH',
  oklahoma: 'OK',
  oregon: 'OR',
  pennsylvania: 'PA',
  'rhode island': 'RI',
  'south carolina': 'SC',
  'south dakota': 'SD',
  tennessee: 'TN',
  texas: 'TX',
  utah: 'UT',
  vermont: 'VT',
  virginia: 'VA',
  washington: 'WA',
  'west virginia': 'WV',
  wisconsin: 'WI',
  wyoming: 'WY',
};

/**
 * `buildings.region` is free text and is already inconsistent in production —
 * Jersey City rows carry both "NJ" and "New Jersey". Without this the same
 * city would emit two `areaServed` entries.
 */
export function normalizeState(region: string | null | undefined): string | null {
  const raw = (region ?? '').trim();
  if (!raw) return null;
  if (/^[A-Za-z]{2}$/.test(raw)) return raw.toUpperCase();
  return STATE_CODES[raw.toLowerCase()] ?? null;
}

/**
 * County lookup for NJ municipalities.
 *
 * NJ reuses municipality names across counties (Washington Township exists in
 * five). A name that maps to more than one county is left out entirely rather
 * than guessing — an absent `containedInPlace` is a smaller error than one
 * that puts the city in the wrong county.
 */
const NJ_COUNTY_BY_CITY: ReadonlyMap<string, string> = (() => {
  const countiesByName = new Map<string, Set<string>>();
  for (const muni of NJ_MUNICIPALITIES) {
    const key = muni.name.trim().toLowerCase();
    const set = countiesByName.get(key) ?? new Set<string>();
    set.add(muni.county);
    countiesByName.set(key, set);
  }

  const unambiguous = new Map<string, string>();
  for (const [name, counties] of countiesByName) {
    const [only] = [...counties];
    if (counties.size === 1 && only) unambiguous.set(name, only);
  }
  return unambiguous;
})();

function countyFor(city: string, state: string): string | undefined {
  if (state !== 'NJ') return undefined;
  return NJ_COUNTY_BY_CITY.get(city.trim().toLowerCase());
}

function canQuerySupabase(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

type BuildingAreaRow = {
  name?: string | null;
  city?: string | null;
  region?: string | null;
  is_seed?: boolean | null;
};

/**
 * Collapse building rows into a sorted, deduped set of served areas.
 *
 * Exported for the validation script so the normalization rules can be tested
 * without a database.
 */
export function toServedAreas(rows: readonly BuildingAreaRow[]): ServedArea[] {
  const byKey = new Map<string, ServedArea>();

  for (const row of filterPublicEntities(rows)) {
    const city = (row.city ?? '').trim();
    const state = normalizeState(row.region);
    if (!city || !state) continue;

    const key = `${city.toLowerCase()}|${state}`;
    if (byKey.has(key)) continue;

    const county = countyFor(city, state);
    byKey.set(key, county ? { city, state, county } : { city, state });
  }

  // Stable order keeps the emitted JSON-LD byte-identical between builds, so a
  // rebuild with no data change produces no diff in the static HTML.
  return [...byKey.values()].sort(
    (a, b) => a.state.localeCompare(b.state) || a.city.localeCompare(b.city),
  );
}

async function queryServedAreas(): Promise<ServedArea[] | null> {
  if (!canQuerySupabase()) return null;

  try {
    const admin = supabaseAdmin();
    const { data, error } = await admin
      .from('buildings')
      .select('name, city, region, is_seed')
      .in('status', [...SERVED_AREA_STATUSES])
      .not('city', 'is', null);

    if (error || !data) return null;
    return toServedAreas(data as BuildingAreaRow[]);
  } catch {
    return null;
  }
}

const cachedServedAreas = unstable_cache(queryServedAreas, [SERVED_AREAS_TAG], {
  revalidate: SERVED_AREAS_TTL_SECONDS,
  tags: [SERVED_AREAS_TAG],
});

/**
 * Cities Lavo currently serves, for schema `areaServed`.
 *
 * Returns `null` when Supabase is unreachable or has no public buildings. The
 * caller omits `areaServed` in that case: claiming no coverage is recoverable,
 * claiming stale coverage is the failure mode this file was built to avoid.
 */
export async function getServedAreas(): Promise<ServedArea[] | null> {
  const areas = await cachedServedAreas();
  return areas && areas.length > 0 ? areas : null;
}
