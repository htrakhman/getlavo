const PLACES_AUTOCOMPLETE = 'https://places.googleapis.com/v1/places:autocomplete';
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

  const body: Record<string, unknown> = {
    input: input.trim().slice(0, 200),
    includedRegionCodes: ['us'],
    includedPrimaryTypes: ['establishment', 'premise', 'street_address', 'point_of_interest'],
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
