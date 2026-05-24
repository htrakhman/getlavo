import { getCountyProfile } from '../county-profiles';
import { getMergedEnrichment } from '../enrichment';
import {
  getCountyVehicleCareFactors,
  getRegionFlags,
  type RegionFlags,
} from '../region-flags';
import {
  alphabeticalNeighbors,
  getCityTier,
  getLocalDisplayName,
  getSeoLocalityLabel,
  pick,
} from '../utils';
import { getMunicipalitiesByCounty, type NjMunicipality } from '../nj-municipalities';
import type { CityEnrichment, CityTier } from '../types';

const PARKING_BY_TYPE: Record<string, string> = {
  city: 'urban garages, mid-rise decks, and mixed surface lots',
  township: 'garden-style surface lots, podiums, and scattered garage bays',
  borough: 'compact borough lots, small garages, and walkable street-adjacent parking',
  town: 'walkable downtown blocks with small garages and permitted lot zones',
  village: 'village-center lots and small shared parking courts',
};

export type CityTemplateContext = {
  muni: NjMunicipality;
  tier: CityTier;
  enrichment: CityEnrichment;
  flags: RegionFlags;
  /** Display name for H2 copy */
  name: string;
  /** Label for meta title (may include county) */
  seoName: string;
  slug: string;
  county: string;
  countySlug: string;
  seed: string;
  region: string;
  parking: string;
  commute: string;
  corridor: string;
  parkingTypes: string;
  nearbyRoads: string;
  nearbyTransit: string;
  neighborNames: string[];
  neighborText: string;
  commonPropertyTypes: string;
  localVehicleCareFactors: string;
  neighborhoods?: string[];
};

const GENERIC_VEHICLE_FACTORS = [
  'winter road salt',
  'road grime',
  'pollen',
  'everyday parking lot dust',
];

export function buildContext(muni: NjMunicipality): CityTemplateContext {
  const profile = getCountyProfile(muni.countySlug);
  const enrichment = getMergedEnrichment(muni.slug);
  const flags = getRegionFlags(muni.countySlug);
  const neighbors = alphabeticalNeighbors(muni).map((n) => {
    const match = getMunicipalitiesByCounty(muni.countySlug).find((x) => x.name === n);
    return match ? getLocalDisplayName(match) : n;
  });
  const parkingTypes =
    enrichment.nearbyRoads?.length
      ? `${PARKING_BY_TYPE[muni.type] ?? 'on-site parking areas'}`
      : PARKING_BY_TYPE[muni.type] ?? 'garages, assigned spaces, surface lots, and approved building parking areas';

  return {
    muni,
    tier: getCityTier(muni),
    enrichment,
    name: getLocalDisplayName(muni),
    seoName: getSeoLocalityLabel(muni),
    slug: muni.slug,
    county: muni.county,
    countySlug: muni.countySlug,
    seed: muni.geoid,
    region: profile.region,
    parking: profile.parking,
    commute: profile.commute,
    corridor: profile.corridor,
    parkingTypes,
    nearbyRoads: enrichment.nearbyRoads?.join(', ') ?? profile.corridor,
    nearbyTransit: enrichment.nearbyTransit ?? 'local transit and commuter patterns',
    neighborNames: neighbors,
    neighborText: neighbors.length ? neighbors.join(' and ') : `nearby ${muni.county} County communities`,
    commonPropertyTypes:
      'apartment buildings, condo communities, garden apartments, and managed residential properties',
    localVehicleCareFactors: (() => {
      const factors = enrichment.localVehicleCareFactors;
      const isGeneric =
        !factors?.length ||
        (factors.length === 4 &&
          factors.every((f, i) => f === GENERIC_VEHICLE_FACTORS[i]));
      if (isGeneric) {
        return getCountyVehicleCareFactors(muni.countySlug).join(', ');
      }
      return factors.join(', ');
    })(),
    neighborhoods: enrichment.neighborhoods,
    flags,
  };
}

/** Deterministic pick unique per municipality and section key. */
export function pickFor(ctx: CityTemplateContext, key: string, options: string[]): string {
  return pick(ctx.seed + ctx.slug + key, options);
}

export { pick };
