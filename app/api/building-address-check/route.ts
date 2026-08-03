import { NextRequest, NextResponse } from 'next/server';
import { normalizeAddress } from '@/lib/address-normalize';
import { buildingCandidateKey } from '@/lib/building-candidate';
import { findBuildingForPlace } from '@/lib/building-funnel-match';
import { isValidEmail } from '@/lib/notification-emails';
import { classifyProperty, placeDetails, type PlaceDetails } from '@/lib/places-google';
import { clientIp, rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSessionUser } from '@/lib/supabase/server';

/**
 * The address-check widget's one endpoint.
 *
 * 1. Resolve the entered address to a place (Google, when configured) and,
 *    from there, to a `buildings` row using the same fuzzy matching the main
 *    check-building funnel uses (`findBuildingForPlace`) — so "served" here
 *    means the same thing it means everywhere else on the site, not a second,
 *    slightly different definition.
 * 2. Served — active partnership with at least one live package, or an
 *    already-active partnership — returns a redirect into signup/booking.
 *    Not served — inserts a `building_waitlist` row and returns that.
 *
 * "Served" deliberately excludes a building that merely exists in `buildings`
 * with a `prospect` row and no operator: a resident there cannot book yet, so
 * routing them to signup would 404 into an empty booking flow. That case
 * still counts as "resolved" for the waitlist label/unit-count enrichment
 * below — the building name to prospect on is already known, only the
 * operator relationship isn't there yet.
 */
export async function POST(req: NextRequest) {
  const rl = rateLimit(`addr-check:${clientIp(req)}`, { limit: 30, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse(rl);

  const body = await req.json().catch(() => ({}));
  const placeId = typeof body.placeId === 'string' ? body.placeId : '';
  const formattedAddressInput =
    typeof body.formattedAddress === 'string' ? body.formattedAddress.trim() : '';
  const displayNameInput = typeof body.displayName === 'string' ? body.displayName.trim() : '';
  const sessionToken = typeof body.sessionToken === 'string' ? body.sessionToken : undefined;
  const sourcePage = typeof body.sourcePage === 'string' ? body.sourcePage.slice(0, 300) : null;

  if (!placeId && !formattedAddressInput) {
    return NextResponse.json({ error: 'Enter an address' }, { status: 400 });
  }

  let place: PlaceDetails | null = null;

  if (placeId && process.env.GOOGLE_PLACES_API_KEY) {
    place = await placeDetails(placeId, sessionToken);
    if (!place) return NextResponse.json({ error: 'Could not look up that address' }, { status: 404 });
  } else if (formattedAddressInput) {
    place = {
      placeId: '',
      formattedAddress: formattedAddressInput,
      displayName:
        displayNameInput || (formattedAddressInput.split(',')[0]?.trim() ?? formattedAddressInput),
      types: ['establishment'],
      lat: typeof body.lat === 'number' ? body.lat : undefined,
      lng: typeof body.lng === 'number' ? body.lng : undefined,
    };
  } else {
    return NextResponse.json({ error: 'Address search is not configured' }, { status: 503 });
  }

  const candidateKey = buildingCandidateKey(place.placeId || null, place.formattedAddress);
  const sb = supabaseAdmin();
  const { building } = await findBuildingForPlace(sb, place);

  let served = false;
  if (building) {
    const { data: partnership } = await sb
      .from('partnerships')
      .select('id, status, operator:operators(id)')
      .eq('building_id', building.id)
      .eq('status', 'active')
      .maybeSingle();

    if (partnership) {
      const operator = partnership.operator as { id?: string } | { id?: string }[] | null;
      const operatorId = Array.isArray(operator) ? operator[0]?.id : operator?.id;
      let packageCount = 0;
      if (operatorId) {
        const { count } = await sb
          .from('service_packages')
          .select('*', { count: 'exact', head: true })
          .eq('operator_id', operatorId)
          .eq('active', true);
        packageCount = count ?? 0;
      }
      served = packageCount > 0 || partnership.status === 'active';
    }
  }

  if (served && building) {
    return NextResponse.json({
      status: 'served',
      building: { slug: building.slug, name: building.name },
      redirectUrl: `/signup?role=resident&building=${encodeURIComponent(building.slug)}&promo=FIRSTWASH`,
    });
  }

  // Not served: this call must carry an email to waitlist.
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!isValidEmail(email)) {
    // Still tell the client whether the address is known, so it can render
    // the "join the waitlist" panel before asking for an email — the caller
    // makes a second request once the resident types one in.
    if (!body.email) {
      return NextResponse.json({
        status: 'not_served',
        building: building ? { name: building.name } : null,
        classification: classifyProperty(place.types),
      });
    }
    return NextResponse.json({ error: 'Enter a valid email' }, { status: 400 });
  }

  const normalized = normalizeAddress(place.formattedAddress || formattedAddressInput);
  const buildingLabel = (building?.name || place.displayName || '').trim() || 'Unknown building';

  const insert = {
    building_id: building?.id ?? null,
    building_candidate_key: candidateKey,
    email,
    building_label: buildingLabel,
    formatted_address: place.formattedAddress || formattedAddressInput || null,
    normalized_address: normalized.normalized || null,
    address_key: normalized.key || null,
    unit: normalized.unit || null,
    unit_count: building?.id ? await fetchUnitCount(sb, building.id) : null,
    source_page: sourcePage,
    place_id: place.placeId || null,
    lat: typeof place.lat === 'number' ? place.lat : null,
    lng: typeof place.lng === 'number' ? place.lng : null,
    notify_email: true,
    notify_sms: false,
    profile_id: (await getSessionUser().catch(() => null))?.user?.id ?? null,
  };

  const { error } = await sb.from('building_waitlist').insert(insert);
  if (error) {
    console.error('building-address-check waitlist insert', error);
    return NextResponse.json({ error: 'Could not save' }, { status: 500 });
  }

  return NextResponse.json({
    status: 'waitlisted',
    building: building ? { name: building.name } : null,
    normalizedAddress: normalized.normalized || null,
  });
}

async function fetchUnitCount(
  sb: ReturnType<typeof supabaseAdmin>,
  buildingId: string,
): Promise<number | null> {
  const { data } = await sb.from('buildings').select('total_units').eq('id', buildingId).maybeSingle();
  return data?.total_units ?? null;
}
