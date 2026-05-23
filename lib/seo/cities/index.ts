import { COUNTY_CITY_PAGES } from './content';
import { NEW_JERSEY_STATE_PAGE } from './state-page';
import type { CityPage } from './types';

export type { CityFaq, CityPage } from './types';
export {
  NJ_MUNICIPALITIES,
  NJ_COUNTY_SLUGS,
  getMunicipalityBySlug,
  getMunicipalitiesByCounty,
  getCountiesGrouped,
} from './nj-municipalities';
export type { NjMunicipality, NjCountySlug } from './nj-municipalities';

export const CITIES: CityPage[] = [NEW_JERSEY_STATE_PAGE, ...COUNTY_CITY_PAGES];

export const CITY_SLUGS = CITIES.map((c) => c.slug);

export function getCityBySlug(slug: string): CityPage | undefined {
  return CITIES.find((c) => c.slug === slug);
}

export function getMunicipalityCities(): CityPage[] {
  return COUNTY_CITY_PAGES;
}
