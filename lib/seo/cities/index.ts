import { buildCityPage } from './build-city-page';
import { buildStatePage } from './build-state-page';
import { NJ_MUNICIPALITIES, getMunicipalityBySlug } from './nj-municipalities';
import type { CityPageViewModel } from './types';

export type { CityFaq, CityPage, CityPageViewModel, CityTier, CityEnrichment } from './types';
export {
  NJ_MUNICIPALITIES,
  NJ_COUNTY_SLUGS,
  getMunicipalityBySlug,
  getMunicipalitiesByCounty,
  getCountiesGrouped,
} from './nj-municipalities';
export type { NjMunicipality, NjCountySlug } from './nj-municipalities';
export { buildCityPage } from './build-city-page';
export { buildStatePage } from './build-state-page';
export { getCountyProfile, COUNTY_PROFILES } from './county-profiles';

const STATE_SLUG = 'new-jersey';

export const CITY_SLUGS = [STATE_SLUG, ...NJ_MUNICIPALITIES.map((m) => m.slug)];

export function getCityPageBySlug(slug: string): CityPageViewModel | undefined {
  if (slug === STATE_SLUG) return buildStatePage();
  const muni = getMunicipalityBySlug(slug);
  if (!muni) return undefined;
  return buildCityPage(muni);
}

/** @deprecated Use getCityPageBySlug */
export function getCityBySlug(slug: string): CityPageViewModel | undefined {
  return getCityPageBySlug(slug);
}

export function getMunicipalityCityPages(): CityPageViewModel[] {
  return NJ_MUNICIPALITIES.map((m) => buildCityPage(m));
}

export function getAllCityPages(): CityPageViewModel[] {
  return [buildStatePage(), ...getMunicipalityCityPages()];
}
