import { KEEP_CITY_SLUG_SET } from '@/lib/seo/keep-cities';
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
  getKeptMunicipalitiesByCounty,
  getCountiesGrouped,
} from './nj-municipalities';
export type { NjMunicipality, NjCountySlug } from './nj-municipalities';
export { buildCityPage } from './build-city-page';
export { buildStatePage } from './build-state-page';
export { getCountyProfile, COUNTY_PROFILES } from './county-profiles';

const STATE_SLUG = 'new-jersey';

export const KEPT_MUNICIPALITIES = NJ_MUNICIPALITIES.filter((m) =>
  KEEP_CITY_SLUG_SET.has(m.slug),
);

/** Indexable city routes: state overview plus kept municipalities only. */
export const CITY_SLUGS = [STATE_SLUG, ...KEPT_MUNICIPALITIES.map((m) => m.slug)];

export function isIndexableCitySlug(slug: string): boolean {
  return slug === STATE_SLUG || KEEP_CITY_SLUG_SET.has(slug);
}

export function getCityPageBySlug(slug: string): CityPageViewModel | undefined {
  if (slug === STATE_SLUG) return buildStatePage();
  if (!KEEP_CITY_SLUG_SET.has(slug)) return undefined;
  const muni = getMunicipalityBySlug(slug);
  if (!muni) return undefined;
  return buildCityPage(muni);
}

/** @deprecated Use getCityPageBySlug */
export function getCityBySlug(slug: string): CityPageViewModel | undefined {
  return getCityPageBySlug(slug);
}

export function getMunicipalityCityPages(): CityPageViewModel[] {
  return KEPT_MUNICIPALITIES.map((m) => buildCityPage(m));
}

export function getAllCityPages(): CityPageViewModel[] {
  return [buildStatePage(), ...getMunicipalityCityPages()];
}
