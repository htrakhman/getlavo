export type RegionFlags = {
  isShoreCounty: boolean;
  isHudsonWaterfront: boolean;
  isGoldCoastBergen: boolean;
  isPhiladelphiaCommuter: boolean;
  isNycCommuter: boolean;
  isPharmaCorporate: boolean;
};

const SHORE_COUNTIES = new Set(['atlantic', 'cape-may', 'ocean', 'monmouth']);
const HUDSON_WATERFRONT = new Set(['hudson']);
const GOLD_COAST_BERGEN = new Set(['bergen']);
const PHILADELPHIA_COMMUTER = new Set(['camden', 'gloucester', 'burlington', 'salem', 'cumberland']);
const NYC_COMMUTER = new Set(['hudson', 'bergen', 'essex', 'union', 'passaic', 'morris', 'middlesex']);
const PHARMA_CORPORATE = new Set(['mercer', 'middlesex', 'somerset', 'morris']);

export function getRegionFlags(countySlug: string): RegionFlags {
  return {
    isShoreCounty: SHORE_COUNTIES.has(countySlug),
    isHudsonWaterfront: HUDSON_WATERFRONT.has(countySlug),
    isGoldCoastBergen: GOLD_COAST_BERGEN.has(countySlug),
    isPhiladelphiaCommuter: PHILADELPHIA_COMMUTER.has(countySlug),
    isNycCommuter: NYC_COMMUTER.has(countySlug),
    isPharmaCorporate: PHARMA_CORPORATE.has(countySlug),
  };
}

export const SHORE_COUNTY_SLUGS = [...SHORE_COUNTIES];

/** County-default vehicle care factors when enrichment is generic. */
export const COUNTY_VEHICLE_CARE: Record<string, string[]> = {
  atlantic: ['coastal salt air', 'boardwalk and casino district dust', 'winter road salt', 'pollen'],
  bergen: ['bridge-and-tunnel grime', 'winter road salt', 'garage dust', 'pollen'],
  burlington: ['Pine Barrens pollen', 'I-295 road film', 'winter salt', 'lot dust'],
  camden: ['Philadelphia commuter grime', 'winter salt', 'pollen', 'hospital-corridor dust'],
  'cape-may': ['coastal salt air', 'seasonal shore traffic', 'sand and pollen', 'humidity film'],
  cumberland: ['Route 55 road film', 'winter salt', 'agricultural pollen', 'lot dust'],
  essex: ['urban tunnel grime', 'winter salt', 'garage dust', 'pollen'],
  gloucester: ['Delaware Valley commuter film', 'winter salt', 'pollen', 'lot dust'],
  hudson: ['urban road film', 'winter salt', 'garage dust', 'PATH corridor grime'],
  hunterdon: ['rural road dust', 'winter salt', 'pollen', 'farm corridor film'],
  mercer: ['Route 1 corridor film', 'winter salt', 'campus-area pollen', 'garage dust'],
  middlesex: ['Turnpike corridor grime', 'winter salt', 'corporate-campus pollen', 'lot dust'],
  monmouth: ['coastal salt air', 'Garden State Parkway film', 'winter salt', 'shore-season pollen'],
  morris: ['Route 287 corporate-corridor film', 'winter salt', 'tree pollen', 'garage dust'],
  ocean: ['barrier-island salt air', 'Parkway summer traffic', 'winter salt', 'sand and pollen'],
  passaic: ['Route 23 corridor film', 'winter salt', 'warehouse-district dust', 'pollen'],
  salem: ['rural highway film', 'winter salt', 'Delaware Valley dust', 'pollen'],
  somerset: ['Route 287 pharma-corridor film', 'winter salt', 'pollen', 'campus lot dust'],
  sussex: ['lake-community pollen', 'I-80 winter salt', 'rural road dust', 'tree sap'],
  union: ['Newark Airport corridor film', 'winter salt', 'urban garage dust', 'pollen'],
  warren: ['I-78 corridor film', 'winter salt', 'river-valley pollen', 'rural dust'],
};

export function getCountyVehicleCareFactors(countySlug: string): string[] {
  return (
    COUNTY_VEHICLE_CARE[countySlug] ?? [
      'winter road salt',
      'road grime',
      'pollen',
      'everyday parking lot dust',
    ]
  );
}
