import { NextRequest, NextResponse } from 'next/server';
import { placesAutocomplete, type PlacePrediction } from '@/lib/places-google';
import { rateLimit, clientIp, rateLimitResponse } from '@/lib/rate-limit';

type Photon = {
  features?: Array<{
    properties: {
      name?: string;
      housenumber?: string;
      street?: string;
      city?: string;
      town?: string;
      village?: string;
      state?: string;
      postcode?: string;
      countrycode?: string;
    };
    geometry: { coordinates: [number, number] };
  }>;
};

async function photonFallback(input: string): Promise<PlacePrediction[]> {
  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(input.slice(0, 200))}&limit=6&lang=en`;
    const res = await fetch(url, { headers: { 'User-Agent': 'getlavo/1.0' } });
    if (!res.ok) return [];
    const data = (await res.json()) as Photon;
    const out: PlacePrediction[] = [];
    for (const f of data.features ?? []) {
      const p = f.properties;
      const street = [p.housenumber, p.street].filter(Boolean).join(' ');
      const main = p.name && street ? `${p.name} — ${street}` : p.name || street;
      const tail = [p.city ?? p.town ?? p.village, p.state, p.postcode].filter(Boolean).join(', ');
      if (!main) continue;
      const [lng, lat] = f.geometry.coordinates;
      const formattedAddress = [main, tail].filter(Boolean).join(', ');
      out.push({
        placeId: '', // synthetic — match endpoint will fall back to formattedAddress
        mainText: main,
        secondaryText: tail,
        formattedAddress,
        lat: typeof lat === 'number' ? lat : undefined,
        lng: typeof lng === 'number' ? lng : undefined,
      });
    }
    return out;
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(`places-ac:${clientIp(req)}`, { limit: 30, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse(rl);

  const body = await req.json().catch(() => ({}));
  const input = typeof body.input === 'string' ? body.input.trim() : '';
  const sessionToken = typeof body.sessionToken === 'string' ? body.sessionToken : undefined;
  if (input.length < 3) return NextResponse.json({ predictions: [] });

  const hasGoogle = !!process.env.GOOGLE_PLACES_API_KEY;
  let predictions: PlacePrediction[] = hasGoogle ? await placesAutocomplete(input, sessionToken) : [];
  let source: 'google' | 'photon' = 'google';
  if (predictions.length === 0) {
    predictions = await photonFallback(input);
    source = 'photon';
  }
  return NextResponse.json({ predictions, source });
}
