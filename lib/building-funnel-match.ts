import type { SupabaseClient } from '@supabase/supabase-js';
import type { PlaceDetails } from '@/lib/places-google';
import { normalizeLocationText } from '@/lib/building-candidate';

const STREET_ABBREVS: [string, string][] = [
  ['lane', 'ln'],
  ['ln', 'lane'],
  ['street', 'st'],
  ['st', 'street'],
  ['avenue', 'ave'],
  ['ave', 'avenue'],
  ['boulevard', 'blvd'],
  ['blvd', 'boulevard'],
  ['drive', 'dr'],
  ['dr', 'drive'],
  ['road', 'rd'],
  ['rd', 'road'],
  ['court', 'ct'],
  ['ct', 'court'],
  ['place', 'pl'],
  ['pl', 'place'],
];

function streetVariants(s: string): string[] {
  const variants = new Set([s.trim()]);
  for (const [from, to] of STREET_ABBREVS) {
    const re = new RegExp(`\\b${from}\\b`, 'gi');
    if (re.test(s)) variants.add(s.replace(re, to));
  }
  return [...variants];
}

function parseFormattedAddress(formatted: string) {
  const parts = formatted.split(',').map((p) => p.trim()).filter(Boolean);
  const street = parts[0] ?? '';
  const city = parts[1] ?? '';
  const stateZip = parts[2] ?? '';
  const zip = stateZip.match(/\b(\d{5})(?:-\d{4})?\b/)?.[1] ?? '';
  const region = stateZip.replace(/\b\d{5}(?:-\d{4})?\b/, '').trim();
  return { street, city, region, zip };
}

export type FunnelBuilding = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  region: string | null;
  address_line1: string | null;
  status: string;
  wash_day: string | null;
  welcome_message: string | null;
  logo_url: string | null;
  brand_color: string | null;
  google_place_id: string | null;
};

const BUILDING_SELECT =
  'id, name, slug, city, region, address_line1, status, wash_day, welcome_message, logo_url, brand_color, google_place_id';

type AddressQuery = { col: string; val: string; city?: string; zip?: string };

async function queryBuilding(
  sb: SupabaseClient,
  { col, val, city, zip }: AddressQuery,
): Promise<FunnelBuilding | null> {
  let q = sb.from('buildings').select(BUILDING_SELECT).ilike(col, `%${val}%`);
  if (city && city.length > 2) q = q.ilike('city', `%${city}%`);
  if (zip) q = q.eq('postal_code', zip);
  const { data, error } = await q.limit(1).maybeSingle();
  if (error) console.error('findBuildingForPlace query', { col, val, city, zip, error: error.message });
  return (data as FunnelBuilding | null) ?? null;
}

/** Resolve a buildings row from Google place details (place id, name, or street). */
export async function findBuildingForPlace(
  sb: SupabaseClient,
  place: PlaceDetails,
): Promise<{ building: FunnelBuilding | null; debug: Record<string, unknown> }> {
  const debug: Record<string, unknown> = {};
  const parsed = parseFormattedAddress(place.formattedAddress);
  debug.parsed = parsed;

  if (place.placeId) {
    const { data: byPlace } = await sb
      .from('buildings')
      .select(BUILDING_SELECT)
      .eq('google_place_id', place.placeId)
      .maybeSingle();
    if (byPlace) return { building: byPlace as FunnelBuilding, debug };
  }

  const parts = (place.displayName || '').split(/\s*[—–]\s*/);
  const namePart = parts[0].split(',')[0].trim();
  const afterDash = (parts[1] ?? '').split(',')[0].trim();

  let addrForStreet = place.formattedAddress;
  if (namePart && addrForStreet.toLowerCase().startsWith(namePart.toLowerCase())) {
    addrForStreet = addrForStreet.slice(namePart.length).replace(/^[,\s—–]+/, '');
  }
  const streetFromFormatted = addrForStreet.split(',')[0].trim();
  const street = afterDash.length > 3 ? afterDash : streetFromFormatted || parsed.street;

  debug.displayName = place.displayName;
  debug.formattedAddress = place.formattedAddress;
  debug.namePart = namePart;
  debug.street = street;

  const city = parsed.city;
  const zip = parsed.zip;

  const candidates: AddressQuery[] = [];
  if (namePart.length > 3) candidates.push({ col: 'name', val: namePart, city, zip });

  const streets = new Set<string>();
  for (const s of [street, streetFromFormatted, parsed.street].filter((x) => x.length > 3)) {
    for (const v of streetVariants(s)) streets.add(v);
  }
  for (const val of streets) {
    candidates.push({ col: 'address_line1', val, city, zip });
    // Also try without city/zip filter in case region spelling differs
    if (city || zip) candidates.push({ col: 'address_line1', val });
  }

  if (zip) {
    const { data: byZip } = await sb
      .from('buildings')
      .select(BUILDING_SELECT)
      .eq('postal_code', zip)
      .ilike('city', `%${city || 'Jersey'}%`)
      .limit(20);
    const normStreet = normalizeLocationText(street || parsed.street);
    for (const row of byZip ?? []) {
      const normRow = normalizeLocationText(row.address_line1 ?? '');
      if (normStreet.length >= 6 && (normRow.includes(normStreet) || normStreet.includes(normRow))) {
        return { building: row as FunnelBuilding, debug: { ...debug, matchedBy: 'postal_norm' } };
      }
    }
  }

  debug.candidates = candidates;
  const results: unknown[] = [];

  for (const query of candidates) {
    const data = await queryBuilding(sb, query);
    results.push({ ...query, found: !!data });
    if (data) return { building: data, debug: { ...debug, results } };
  }

  debug.results = results;
  return { building: null, debug };
}
