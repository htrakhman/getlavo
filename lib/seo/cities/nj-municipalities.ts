import manifest from '@/data/nj-municipalities.json';

export type NjMunicipality = {
  name: string;
  slug: string;
  county: string;
  countySlug: string;
  type: string;
  geoid: string;
};

export const NJ_MUNICIPALITIES = manifest as NjMunicipality[];

export const NJ_COUNTY_SLUGS = [
  'atlantic',
  'bergen',
  'burlington',
  'camden',
  'cape-may',
  'cumberland',
  'essex',
  'gloucester',
  'hudson',
  'hunterdon',
  'mercer',
  'middlesex',
  'monmouth',
  'morris',
  'ocean',
  'passaic',
  'salem',
  'somerset',
  'sussex',
  'union',
  'warren',
] as const;

export type NjCountySlug = (typeof NJ_COUNTY_SLUGS)[number];

const bySlug = new Map(NJ_MUNICIPALITIES.map((m) => [m.slug, m]));

export function getMunicipalityBySlug(slug: string): NjMunicipality | undefined {
  return bySlug.get(slug);
}

export function getMunicipalitiesByCounty(countySlug: string): NjMunicipality[] {
  return NJ_MUNICIPALITIES.filter((m) => m.countySlug === countySlug);
}

export function getCountiesGrouped(): { county: string; countySlug: string; municipalities: NjMunicipality[] }[] {
  const map = new Map<string, NjMunicipality[]>();
  for (const m of NJ_MUNICIPALITIES) {
    const list = map.get(m.countySlug) ?? [];
    list.push(m);
    map.set(m.countySlug, list);
  }
  return NJ_COUNTY_SLUGS.filter((slug) => map.has(slug)).map((countySlug) => {
    const municipalities = map.get(countySlug)!;
    return {
      county: municipalities[0]!.county,
      countySlug,
      municipalities: municipalities.sort((a, b) => a.name.localeCompare(b.name)),
    };
  });
}
