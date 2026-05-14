import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { buildingCandidateKey } from '@/lib/building-candidate';
import { classifyProperty, placeDetails } from '@/lib/places-google';
import { rateLimit, clientIp, rateLimitResponse } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const rl = rateLimit(`bf-match:${clientIp(req)}`, { limit: 40, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse(rl);

  const body = await req.json().catch(() => ({}));
  const placeId = typeof body.placeId === 'string' ? body.placeId : '';
  const sessionToken = typeof body.sessionToken === 'string' ? body.sessionToken : undefined;
  if (!placeId) return NextResponse.json({ error: 'placeId required' }, { status: 400 });

  if (!process.env.GOOGLE_PLACES_API_KEY) {
    return NextResponse.json({ error: 'Address search is not configured' }, { status: 503 });
  }

  const place = await placeDetails(placeId, sessionToken);
  if (!place) return NextResponse.json({ error: 'Place not found' }, { status: 404 });

  const cls = classifyProperty(place.types);
  const candidateKey = buildingCandidateKey(place.placeId, place.formattedAddress);

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
    .in('status', ['prospect', 'pilot', 'active'])
    .maybeSingle();

  let building = byPlace;
  if (!building) {
    const firstPart = (place.displayName || place.formattedAddress).split(',')[0]?.trim() ?? '';
    if (firstPart.length > 3) {
      const { data: nameMatch } = await sb
        .from('buildings')
        .select('id, name, slug, city, region, address_line1, status, wash_day, welcome_message, logo_url, brand_color, google_place_id')
        .ilike('name', `%${firstPart}%`)
        .in('status', ['prospect', 'pilot', 'active'])
        .limit(1)
        .maybeSingle();
      building = nameMatch ?? null;
    }
  }

  if (!building) {
    return NextResponse.json({
      branch: 'B',
      candidateKey,
      place,
      building: null,
      requestCount: await countDemand(sb, candidateKey),
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
