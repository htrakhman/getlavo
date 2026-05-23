import tierData from '@/data/city-tiers.json';
import { getCountyProfile } from './county-profiles';
import { getCountyVehicleCareFactors } from './region-flags';
import type { NjMunicipality } from './nj-municipalities';
import { pick } from './utils';
import type { CityEnrichment } from './types';

const TIER1 = new Set(tierData.tier1);

const TYPE_LABEL: Record<string, string> = {
  city: 'city',
  township: 'township',
  borough: 'borough',
  town: 'town',
  village: 'village',
};

/**
 * Synthesizes overview paragraphs for Tier-1 cities missing hand-written overviewExtra.
 */
export function autoTier1Enrichment(muni: NjMunicipality): CityEnrichment | undefined {
  if (!TIER1.has(muni.slug)) return undefined;

  const profile = getCountyProfile(muni.countySlug);
  const name = muni.name;
  const slug = muni.slug;
  const seed = muni.geoid;
  const typeLabel = TYPE_LABEL[muni.type] ?? muni.type;

  const overviewExtra = [
    pick(seed + slug + 'a1', [
      `${name} sits in ${profile.region}, where apartment stock often includes ${profile.parking}. Buildings along ${profile.corridor} commonly see vehicle use from ${profile.commute}.`,
      `In ${name}, many apartment communities rely on ${profile.parking}. Properties near ${profile.corridor} often see steady commuter vehicle use from ${profile.commute}.`,
      `${name} is a ${typeLabel} in ${muni.county} County where residents commonly park in ${profile.parking}, especially near ${profile.corridor}.`,
    ]),
    pick(seed + slug + 'a2', [
      `Depending on the property, on-site mobile washing can work when management defines approved garage or lot zones instead of sending residents to tunnel washes.`,
      `Mobile service in ${name} works best when buildings post clear access rules, quiet hours, and spot labeling before the first operator visit.`,
      `For ${name} residents who already treat car care as a time problem, building-based booking can remove an extra errand from the week.`,
    ]),
    pick(seed + slug + 'a3', [
      `Lavo is building apartment based coverage in ${name}. Availability depends on building approval and whether local operators are available to serve approved properties.`,
      `Property managers in ${name} can offer Lavo as a no cost amenity while residents book and pay for their own washes at the building.`,
      `Operators serving ${muni.county} County can pair ${name} stops with nearby municipalities when parking rules are documented up front.`,
    ]),
  ];

  return {
    overviewExtra,
    localVehicleCareFactors: getCountyVehicleCareFactors(muni.countySlug),
    nearbyTransit: pick(seed + slug + 'tr', [
      profile.commute,
      `commuter patterns along ${profile.corridor}`,
      `local transit and ${profile.commute}`,
    ]),
  };
}
