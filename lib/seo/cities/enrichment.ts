import enrichmentData from '@/data/city-enrichment.json';
import { getCountyVehicleCareFactors } from './region-flags';
import { getMunicipalityBySlug } from './nj-municipalities';
import { autoTier1Enrichment } from './generate-enrichment';
import type { CityEnrichment } from './types';

const FILE_ENRICHMENT = enrichmentData as Record<string, CityEnrichment>;

const GENERIC_VEHICLE_FACTORS = [
  'winter road salt',
  'road grime',
  'pollen',
  'everyday parking lot dust',
];

function isGenericVehicleFactors(factors?: string[]): boolean {
  if (!factors?.length) return true;
  return (
    factors.length === 4 &&
    factors.every((f, i) => f === GENERIC_VEHICLE_FACTORS[i])
  );
}

/** File enrichment merged with auto Tier-1 defaults (file wins when substantive). */
export function getMergedEnrichment(slug: string): CityEnrichment {
  const muni = getMunicipalityBySlug(slug);
  const auto = muni ? autoTier1Enrichment(muni) : undefined;
  const file = FILE_ENRICHMENT[slug];

  const merged: CityEnrichment = { ...auto, ...file };

  if (!file?.overviewExtra?.length && auto?.overviewExtra?.length) {
    merged.overviewExtra = auto.overviewExtra;
  }
  if (!file?.nearbyTransit && auto?.nearbyTransit) {
    merged.nearbyTransit = auto.nearbyTransit;
  }
  if (!file?.neighborhoods?.length && auto?.neighborhoods?.length) {
    merged.neighborhoods = auto.neighborhoods;
  }
  if (isGenericVehicleFactors(file?.localVehicleCareFactors)) {
    merged.localVehicleCareFactors =
      auto?.localVehicleCareFactors ??
      (muni ? getCountyVehicleCareFactors(muni.countySlug) : GENERIC_VEHICLE_FACTORS);
  }

  return merged;
}

/** @deprecated Use getMergedEnrichment */
export function getCityEnrichment(slug: string): CityEnrichment | undefined {
  const merged = getMergedEnrichment(slug);
  return Object.keys(merged).length > 0 ? merged : undefined;
}
