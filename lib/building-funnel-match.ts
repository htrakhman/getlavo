import type { SupabaseClient } from '@supabase/supabase-js';
import type { PlaceDetails } from '@/lib/places-google';

const STREET_ABBREVS: [RegExp, string][] = [
  [/\blane\b/gi, 'Ln'],
  [/\bln\b/gi, 'Lane'],
  [/\bstreet\b/gi, 'St'],
  [/\bst\b/gi, 'Street'],
  [/\bavenue\b/gi, 'Ave'],
  [/\bave\b/gi, 'Avenue'],
  [/\bboulevard\b/gi, 'Blvd'],
  [/\bblvd\b/gi, 'Boulevard'],
  [/\bdrive\b/gi, 'Dr'],
  [/\bdr\b/gi, 'Drive'],
  [/\broad\b/gi, 'Rd'],
  [/\brd\b/gi, 'Road'],
  [/\bcourt\b/gi, 'Ct'],
  [/\bct\b/gi, 'Court'],
  [/\bplace\b/gi, 'Pl'],
  [/\bpl\b/gi, 'Place'],
];

function streetVariants(s: string): string[] {
  const variants = new Set([s]);
  for (const [re, rep] of STREET_ABBREVS) {
    if (re.test(s)) variants.add(s.replace(re, rep));
  }
  return [...variants];
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

/** Resolve a buildings row from Google place details (place id, name, or street). */
export async function findBuildingForPlace(
  sb: SupabaseClient,
  place: PlaceDetails,
): Promise<{ building: FunnelBuilding | null; debug: Record<string, unknown> }> {
  const debug: Record<string, unknown> = {};

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
  const street = afterDash.length > 3 ? afterDash : streetFromFormatted;

  debug.displayName = place.displayName;
  debug.formattedAddress = place.formattedAddress;
  debug.namePart = namePart;
  debug.street = street;

  const candidates: { col: string; val: string }[] = [];
  if (namePart.length > 3) candidates.push({ col: 'name', val: namePart });
  for (const v of street.length > 3 ? streetVariants(street) : []) {
    candidates.push({ col: 'address_line1', val: v });
  }
  if (streetFromFormatted.length > 3 && streetFromFormatted !== street) {
    for (const v of streetVariants(streetFromFormatted)) candidates.push({ col: 'address_line1', val: v });
  }

  debug.candidates = candidates;
  const results: unknown[] = [];

  for (const { col, val } of candidates) {
    const { data, error } = await sb
      .from('buildings')
      .select(BUILDING_SELECT)
      .ilike(col, `%${val}%`)
      .limit(1)
      .maybeSingle();
    results.push({ col, val, found: !!data, error: error?.message });
    if (data) return { building: data as FunnelBuilding, debug: { ...debug, results } };
  }

  debug.results = results;
  return { building: null, debug };
}
