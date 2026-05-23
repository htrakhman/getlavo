import { createHash } from 'crypto';
import tierData from '@/data/city-tiers.json';
import { NJ_MUNICIPALITIES, type NjMunicipality } from './nj-municipalities';
import { getMunicipalitiesByCounty } from './nj-municipalities';
import type { CityTier } from './types';

const TIER1 = new Set(tierData.tier1);

const TYPE_DISPLAY: Record<string, string> = {
  city: 'City',
  township: 'Township',
  borough: 'Borough',
  town: 'Town',
  village: 'Village',
};

const DUPLICATE_NAMES = (() => {
  const counts = new Map<string, number>();
  for (const m of NJ_MUNICIPALITIES) {
    counts.set(m.name, (counts.get(m.name) ?? 0) + 1);
  }
  return new Set([...counts.entries()].filter(([, n]) => n > 1).map(([name]) => name));
})();

export function getLocalDisplayName(muni: NjMunicipality): string {
  if (!DUPLICATE_NAMES.has(muni.name)) return muni.name;
  const typeLabel = TYPE_DISPLAY[muni.type] ?? muni.type;
  return `${muni.name} ${typeLabel}`;
}

const DUPLICATE_DISPLAY_NAMES = (() => {
  const counts = new Map<string, number>();
  for (const m of NJ_MUNICIPALITIES) {
    const d = getLocalDisplayName(m);
    counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  return new Set([...counts.entries()].filter(([, n]) => n > 1).map(([name]) => name));
})();

/** SEO title locality: disambiguate duplicate display names with county. */
export function getSeoLocalityLabel(muni: NjMunicipality): string {
  const display = getLocalDisplayName(muni);
  if (DUPLICATE_DISPLAY_NAMES.has(display)) {
    return `${display}, ${muni.county} County`;
  }
  return display;
}

export function getCityTier(muni: NjMunicipality): CityTier {
  if (TIER1.has(muni.slug)) return 1;
  if (muni.type === 'city') return 2;
  return 3;
}

export function pick(seed: string, options: string[]): string {
  const hash = createHash('md5').update(seed).digest('hex');
  const idx = parseInt(hash.slice(0, 8), 16) % options.length;
  return options[idx]!;
}

export function trimMetaDescription(text: string, max = 160): string {
  if (text.length <= max) return text;
  const trimmed = text.slice(0, max - 1);
  const lastSpace = trimmed.lastIndexOf(' ');
  return (lastSpace > 120 ? trimmed.slice(0, lastSpace) : trimmed).trimEnd() + '…';
}

export function countWords(texts: string[]): number {
  return texts.join(' ').split(/\s+/).filter(Boolean).length;
}

export function alphabeticalNeighbors(muni: NjMunicipality): string[] {
  const inCounty = getMunicipalitiesByCounty(muni.countySlug)
    .map((m) => m.name)
    .sort((a, b) => a.localeCompare(b));
  const idx = inCounty.indexOf(muni.name);
  const out: string[] = [];
  if (idx > 0) out.push(inCounty[idx - 1]!);
  if (idx < inCounty.length - 1) out.push(inCounty[idx + 1]!);
  if (idx > 1) out.push(inCounty[idx - 2]!);
  if (idx < inCounty.length - 2) out.push(inCounty[idx + 2]!);
  return out.slice(0, 2);
}

export function getNearbyCities(muni: NjMunicipality): { slug: string; name: string }[] {
  const inCounty = getMunicipalitiesByCounty(muni.countySlug).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const tier1InCounty = inCounty.filter((m) => TIER1.has(m.slug) && m.slug !== muni.slug);
  const neighbors = inCounty.filter((m) => {
    if (m.slug === muni.slug) return false;
    const names = alphabeticalNeighbors(muni);
    return names.includes(m.name);
  });
  const seen = new Set<string>();
  const result: { slug: string; name: string }[] = [];
  for (const m of [...tier1InCounty, ...neighbors, ...inCounty]) {
    if (m.slug === muni.slug || seen.has(m.slug)) continue;
    seen.add(m.slug);
    result.push({ slug: m.slug, name: getLocalDisplayName(m) });
    if (result.length >= 6) break;
  }
  return result;
}
