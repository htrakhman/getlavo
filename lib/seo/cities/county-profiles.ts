export type CountyProfile = {
  region: string;
  parking: string;
  commute: string;
  corridor: string;
};

export const COUNTY_PROFILES: Record<string, CountyProfile> = {
  atlantic: {
    region: 'South Jersey shore and mainland',
    parking: 'shore towers, casino-area garages, and mainland garden lots near the Parkway',
    commute: 'Atlantic City hospitality workers and Philadelphia commuters',
    corridor: 'the White Horse Pike and Atlantic City Expressway corridors',
  },
  bergen: {
    region: 'Bergen County',
    parking: 'Hudson River high-rise garages, Route 17 garden lots, and Palisades cliffside decks',
    commute: 'Manhattan bridge-and-tunnel commuters',
    corridor: 'Route 4, Route 17, and the Palisades Interstate Parkway',
  },
  burlington: {
    region: 'Burlington County',
    parking: 'Pine Barrens edge garden communities and suburban lots along I-295',
    commute: 'Philadelphia and Shore commuters',
    corridor: 'Route 130 and the NJ Turnpike corridor',
  },
  camden: {
    region: 'Camden County',
    parking: 'row-home adjacent lots, hospital-corridor apartments, and Cherry Hill garden stock',
    commute: 'Philadelphia cross-river commuters',
    corridor: 'Routes 38 and 70 and the PATCO line',
  },
  'cape-may': {
    region: 'Cape May County shore',
    parking: 'seasonal shore rentals, small borough lots, and wetland-adjacent garden apartments',
    commute: 'seasonal tourism and year-round shore residents',
    corridor: 'Garden State Parkway shore exits',
  },
  cumberland: {
    region: 'Cumberland County',
    parking: 'wide surface lots at garden-style complexes and downtown Vineland/Millville stock',
    commute: 'regional employers and Shore weekend traffic',
    corridor: 'Route 55 and the Millville industrial corridor',
  },
  essex: {
    region: 'Essex County',
    parking: 'Newark high-rise garages, South Orange/Montclair mid-rises, and Bloomfield garden lots',
    commute: 'NYC and Newark job-center commuters',
    corridor: 'Routes 3, 21, and 280',
  },
  gloucester: {
    region: 'Gloucester County',
    parking: 'suburban garden apartments and townhome courts off major arterials',
    commute: 'Philadelphia and Wilmington commuters',
    corridor: 'Route 42 and the NJ Turnpike',
  },
  hudson: {
    region: 'Hudson County',
    parking: 'structured garages in waterfront towers and tight mid-rise decks',
    commute: 'Manhattan PATH and ferry commuters',
    corridor: 'the Hudson waterfront and Kennedy Boulevard',
  },
  hunterdon: {
    region: 'Hunterdon County',
    parking: 'low-rise garden apartments, farmhouse conversions, and rural road frontage lots',
    commute: 'Route 78 and I-78 corridor office parks',
    corridor: 'Routes 22, 31, and 202',
  },
  mercer: {
    region: 'Mercer County',
    parking: 'Princeton/Trenton mixed stock from historic walk-ups to Route 1 garden complexes',
    commute: 'state government, education, and pharma campus workers',
    corridor: 'Route 1 and the Princeton corridor',
  },
  middlesex: {
    region: 'Middlesex County',
    parking: 'NJ Turnpike-adjacent garden cities, New Brunswick mid-rises, and Edison lot stock',
    commute: 'NYC, Newark, and Middlesex County corporate campuses',
    corridor: 'Routes 1, 9, and 18',
  },
  monmouth: {
    region: 'Monmouth County',
    parking: 'shore-adjacent garages, Route 35 corridor apartments, and western suburban lots',
    commute: 'NYC ferry/rail and local Shore tourism',
    corridor: 'Routes 35, 36, and the Garden State Parkway',
  },
  morris: {
    region: 'Morris County',
    parking: 'Morris County garden communities, Morris Township corporate-adjacent stock, and Morristown mid-rises',
    commute: 'NYC and Morris County corporate campuses',
    corridor: 'Routes 10, 24, and 287',
  },
  ocean: {
    region: 'Ocean County',
    parking: 'barrier-island seasonal stock and mainland Toms River/Lakewood garden lots',
    commute: 'Shore tourism and North Jersey bedroom-community commuters',
    corridor: 'Garden State Parkway and Route 9',
  },
  passaic: {
    region: 'Passaic County',
    parking: 'Paterson/Clifton urban garages and Wayne/Pompton Lakes suburban lots',
    commute: 'NYC and North Jersey warehouse/logistics corridors',
    corridor: 'Routes 3, 23, and 46',
  },
  salem: {
    region: 'Salem County',
    parking: 'rural highway-frontage apartments and small-town surface lots',
    commute: 'Delaware Valley and South Jersey employers',
    corridor: 'Routes 40 and 49',
  },
  somerset: {
    region: 'Somerset County',
    parking: 'Route 287 corridor garden apartments and Bridgewater/Warren corporate-campus adjacent stock',
    commute: 'Somerset County pharma and finance campuses',
    corridor: 'Routes 22, 202, and 287',
  },
  sussex: {
    region: 'Sussex County',
    parking: 'lake-community garden apartments and rural hillside lots',
    commute: 'I-80 and Route 15 corridor jobs',
    corridor: 'Routes 15, 23, and 94',
  },
  union: {
    region: 'Union County',
    parking: 'Elizabeth/Union urban garages and Cranford/Westfield suburban garden stock',
    commute: 'NYC, Newark Airport, and Union County logistics',
    corridor: 'Routes 1, 9, 22, and the Garden State Parkway',
  },
  warren: {
    region: 'Warren County',
    parking: 'river-valley garden apartments and small-town borough lots',
    commute: 'Lehigh Valley and I-78 corridor jobs',
    corridor: 'Routes 22, 31, and 57',
  },
};

export function getCountyProfile(countySlug: string): CountyProfile {
  return (
    COUNTY_PROFILES[countySlug] ?? {
      region: 'New Jersey',
      parking: 'garages, assigned spaces, surface lots, and approved building parking areas',
      commute: 'regional commuters and local residents',
      corridor: 'nearby commuter routes and local roads',
    }
  );
}
