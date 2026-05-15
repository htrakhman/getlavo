import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { buildingCandidateKey } from '@/lib/building-candidate';
import { classifyProperty, placeDetails, type PlaceDetails } from '@/lib/places-google';
import { rateLimit, clientIp, rateLimitResponse } from '@/lib/rate-limit';

const STREET_ABBREVS: [RegExp, string][] = [
  [/\blane\b/gi, 'Ln'], [/\bln\b/gi, 'Lane'],
  [/\bstreet\b/gi, 'St'], [/\bst\b/gi, 'Street'],
  [/\bavenue\b/gi, 'Ave'], [/\bave\b/gi, 'Avenue'],
  [/\bboulevard\b/gi, 'Blvd'], [/\bblvd\b/gi, 'Boulevard'],
  [/\bdrive\b/gi, 'Dr'], [/\bdr\b/gi, 'Drive'],
  [/\broad\b/gi, 'Rd'], [/\brd\b/gi, 'Road'],
  [/\bcourt\b/gi, 'Ct'], [/\bct\b/gi, 'Court'],
  [/\bplace\b/gi, 'Pl'], [/\bpl\b/gi, 'Place'],
];

function streetVariants(s: string): string[] {
  const variants = new Set([s]);
  for (const [re, rep] of STREET_ABBREVS) {
    if (re.test(s)) variants.add(s.replace(re, rep));
  }
  return [...variants];
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(`bf-match:${clientIp(req)}`, { limit: 40, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse(rl);

  const body = await req.json().catch(() => ({}));
  const placeId = typeof body.placeId === 'string' ? body.placeId : '';
  const formattedAddressParam = typeof body.formattedAddress === 'string' ? body.formattedAddress.trim() : '';
  const displayNameParam = typeof body.displayName === 'string' ? body.displayName.trim() : '';
  const sessionToken = typeof body.sessionToken === 'string' ? body.sessionToken : undefined;

  if (!placeId && !formattedAddressParam) {
    return NextResponse.json({ error: 'placeId or formattedAddress required' }, { status: 400 });
  }

  let place: PlaceDetails | null = null;

  if (placeId && process.env.GOOGLE_PLACES_API_KEY) {
    place = await placeDetails(placeId, sessionToken);
    if (!place) return NextResponse.json({ error: 'Place not found' }, { status: 404 });
  } else if (formattedAddressParam) {
    place = {
      placeId: '',
      formattedAddress: formattedAddressParam,
      displayName: displayNameParam || (formattedAddressParam.split(',')[0]?.trim() ?? formattedAddressParam),
      types: ['establishment'],
      lat: typeof body.lat === 'number' ? body.lat : undefined,
      lng: typeof body.lng === 'number' ? body.lng : undefined,
    };
  } else {
    return NextResponse.json({ error: 'Address search is not configured' }, { status: 503 });
  }

  const cls = classifyProperty(place.types);
  const candidateKey = buildingCandidateKey(place.placeId || null, place.formattedAddress);

  if (cls === 'likely_single_family') {
    return NextResponse.json({
      branch: 'C',
      candidateKey,
      place,
    });
  }

  const sb = supabaseAdmin();

  const { data: byPlace } = await sb
    .from('buildings')
    .select('id, name, slug, city, region, address_line1, status, wash_day, welcome_message, logo_url, brand_color, google_place_id')
    .eq('google_place_id', place.placeId)
    .maybeSingle();

  let building = byPlace;
  const _debug: Record<string, unknown> = {};

  if (!building) {
    // Autocomplete mainText is often "Building Name — 1 Shore Lane" (with em-dash).
    const parts = (place.displayName || '').split(/\s*[—–]\s*/);
    const namePart = parts[0].split(',')[0].trim();
    const afterDash = (parts[1] ?? '').split(',')[0].trim();

    // Strip building name prefix from formattedAddress before taking street segment.
    let addrForStreet = place.formattedAddress;
    if (namePart && addrForStreet.toLowerCase().startsWith(namePart.toLowerCase())) {
      addrForStreet = addrForStreet.slice(namePart.length).replace(/^[,\s—–]+/, '');
    }
    const streetFromFormatted = addrForStreet.split(',')[0].trim();
    const street = afterDash.length > 3 ? afterDash : streetFromFormatted;

    _debug.displayName = place.displayName;
    _debug.formattedAddress = place.formattedAddress;
    _debug.namePart = namePart;
    _debug.street = street;

    const sel = 'id, name, slug, city, region, address_line1, status, wash_day, welcome_message, logo_url, brand_color, google_place_id';

    const candidates: { col: string; val: string }[] = [];
    if (namePart.length > 3) candidates.push({ col: 'name', val: namePart });
    for (const v of (street.length > 3 ? streetVariants(street) : [])) {
      candidates.push({ col: 'address_line1', val: v });
    }
    if (streetFromFormatted.length > 3 && streetFromFormatted !== street) {
      for (const v of streetVariants(streetFromFormatted)) candidates.push({ col: 'address_line1', val: v });
    }

    _debug.candidates = candidates;
    const results: unknown[] = [];

    for (const { col, val } of candidates) {
      const { data, error } = await sb.from('buildings').select(sel)
        .ilike(col, `%${val}%`)
        .limit(1).maybeSingle();
      results.push({ col, val, found: !!data, error: error?.message });
      if (data) { building = data; break; }
    }
    _debug.results = results;
  }

  if (!building) {
    return NextResponse.json({
      branch: 'B',
      candidateKey,
      place,
      building: null,
      requestCount: await countDemand(sb, candidateKey),
      _debug,
    });
  }

  const { data: partnership } = await sb
    .from('partnerships')
    .select('id, status, operator:operators(id, name, description)')
    .eq('building_id', building.id)
    .in('status', ['active', 'pilot'])
    .maybeSingle();

  const operator = (partnership?.operator as any) ?? null;
  let packages: any[] = [];
  if (operator?.id) {
    const { data: pkgs } = await sb
      .from('service_packages')
      .select('id, name, description, price_cents, est_minutes')
      .eq('operator_id', operator.id)
      .eq('active', true)
      .order('price_cents', { ascending: true });
    packages = pkgs ?? [];
  }

  const activeEnough = partnership && (packages.length > 0 || partnership.status === 'active');

  if (activeEnough) {
    return NextResponse.json({
      branch: 'A',
      candidateKey,
      place,
      building,
      partnership,
      operator,
      packages,
      requestCount: await countDemand(sb, candidateKey),
    });
  }

  return NextResponse.json({
    branch: 'B',
    candidateKey,
    place,
    building,
    partnership: partnership ?? null,
    operator,
    packages,
    requestCount: await countDemand(sb, candidateKey),
  });
}

async function countDemand(sb: ReturnType<typeof supabaseAdmin>, candidateKey: string) {
  const [{ count: rc }, { count: wc }] = await Promise.all([
    sb.from('building_requests').select('*', { count: 'exact', head: true }).eq('building_candidate_key', candidateKey),
    sb.from('building_waitlist').select('*', { count: 'exact', head: true }).eq('building_candidate_key', candidateKey),
  ]);
  return (rc ?? 0) + (wc ?? 0);
}
