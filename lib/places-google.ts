const PLACES_AUTOCOMPLETE = 'https://places.googleapis.com/v1/places:autocomplete';
const PLACES_TEXT_SEARCH = 'https://places.googleapis.com/v1/places:searchText';
const PLACES_DETAILS = 'https://places.googleapis.com/v1/places';

export type PlacePrediction = {
  placeId: string;
  mainText: string;
  secondaryText: string;
  /** Optional full address — populated by non-Google fallbacks (e.g. Photon) */
  formattedAddress?: string;
  lat?: number;
  lng?: number;
};

export async function placesAutocomplete(input: string, sessionToken?: string): Promise<PlacePrediction[]> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key || !input.trim()) return [];

  // NOTE: do NOT set includedPrimaryTypes here. The Places API (New) rejects a
  // request that mixes the `establishment` type *collection* with individual
  // types like `premise`/`street_address` with an INVALID_REQUEST (400) error —
  // which made every Google autocomplete call fail and silently return [], so no
  // suggestions ever reached the dropdown. Omitting the filter returns all place
  // types (addresses + named buildings), which is exactly what a "find your
  // building" search wants, and Google ranks the relevant matches first.
  const body: Record<string, unknown> = {
    input: input.trim().slice(0, 200),
    includedRegionCodes: ['us'],
  };
  if (sessionToken) body.sessionToken = sessionToken;

  const res = await fetch(PLACES_AUTOCOMPLETE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    console.error('placesAutocomplete', res.status, t);
    return [];
  }
  const data = (await res.json()) as {
    suggestions?: Array<{
      placePrediction?: {
        placeId: string;
        structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } };
        text?: { text?: string };
      };
    }>;
  };
  const out: PlacePrediction[] = [];
  for (const s of data.suggestions ?? []) {
    const p = s.placePrediction;
    if (!p?.placeId) continue;
    out.push({
      placeId: p.placeId.replace(/^places\//, ''),
      mainText: p.structuredFormat?.mainText?.text ?? p.text?.text ?? '',
      secondaryText: p.structuredFormat?.secondaryText?.text ?? '',
    });
  }
  return out;
}

/**
 * Maps-style querying. Autocomplete is tuned for incremental typing and often
 * returns nothing for a pasted listing that mixes a property name with its
 * street address ("Bingham Office Center 30600 Telegraph, Bingham Farms, MI").
 * Text Search is the endpoint behind Maps search proper, which handles those,
 * so it serves as the retry when autocomplete comes back empty.
 */
export async function placesTextSearch(input: string): Promise<PlacePrediction[]> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key || !input.trim()) return [];

  const res = await fetch(PLACES_TEXT_SEARCH, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location',
    },
    body: JSON.stringify({
      textQuery: input.trim().slice(0, 200),
      regionCode: 'US',
      maxResultCount: 8,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    console.error('placesTextSearch', res.status, t);
    return [];
  }
  const data = (await res.json()) as {
    places?: Array<{
      id?: string;
      displayName?: { text?: string };
      formattedAddress?: string;
      location?: { latitude?: number; longitude?: number };
    }>;
  };
  const out: PlacePrediction[] = [];
  for (const p of data.places ?? []) {
    if (!p.id) continue;
    const name = p.displayName?.text ?? '';
    const addr = p.formattedAddress ?? '';
    if (!name && !addr) continue;
    out.push({
      placeId: p.id.replace(/^places\//, ''),
      mainText: name || addr,
      secondaryText: name ? addr : '',
      formattedAddress: addr,
      lat: p.location?.latitude,
      lng: p.location?.longitude,
    });
  }
  return out;
}

export type PlaceDetails = {
  placeId: string;
  formattedAddress: string;
  displayName: string;
  types: string[];
  lat?: number;
  lng?: number;
  phone?: string;
  website?: string;
};

export async function placeDetails(placeId: string, _sessionToken?: string): Promise<PlaceDetails | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return null;

  const fieldMask = 'id,formattedAddress,displayName,types,location,nationalPhoneNumber,internationalPhoneNumber,websiteUri';
  const pid = placeId.replace(/^places\//, '');
  const res = await fetch(`${PLACES_DETAILS}/${encodeURIComponent(pid)}`, {
    method: 'GET',
    headers: {
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': fieldMask,
    },
  });
  if (!res.ok) {
    const t = await res.text();
    console.error('placeDetails', res.status, t);
    return null;
  }
  const d = (await res.json()) as {
    id?: string;
    formattedAddress?: string;
    displayName?: { text?: string };
    types?: string[];
    location?: { latitude?: number; longitude?: number };
    nationalPhoneNumber?: string;
    internationalPhoneNumber?: string;
    websiteUri?: string;
  };
  if (!d.id) return null;
  const shortId = d.id.replace(/^places\//, '');
  return {
    placeId: shortId,
    formattedAddress: d.formattedAddress ?? '',
    displayName: d.displayName?.text ?? '',
    types: d.types ?? [],
    lat: d.location?.latitude,
    lng: d.location?.longitude,
    phone: d.nationalPhoneNumber || d.internationalPhoneNumber,
    website: d.websiteUri,
  };
}

/** Heuristic: apartment-oriented vs likely single family. */
export function classifyProperty(types: string[]): 'apartment_or_mixed' | 'likely_single_family' {
  const t = new Set(types.map((x) => x.toLowerCase()));
  if (t.has('subpremise')) return 'apartment_or_mixed';
  if (t.has('premise') || t.has('establishment') || t.has('point_of_interest')) return 'apartment_or_mixed';
  if (t.has('street_address') && !t.has('premise')) return 'likely_single_family';
  return 'apartment_or_mixed';
}
