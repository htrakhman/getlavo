import enrichmentData from '@/data/city-enrichment.json';
import type { CityEnrichment } from './types';

const ENRICHMENT_BY_SLUG = enrichmentData as Record<string, CityEnrichment>;

export function getCityEnrichment(slug: string): CityEnrichment | undefined {
  return ENRICHMENT_BY_SLUG[slug];
}
