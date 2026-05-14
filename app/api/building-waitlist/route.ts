import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit, clientIp, rateLimitResponse } from '@/lib/rate-limit';
import { getSessionUser } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const rl = rateLimit(`bwl:${clientIp(req)}`, { limit: 15, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse(rl);

  const body = await req.json().catch(() => ({}));
  const buildingCandidateKey =
    typeof body.buildingCandidateKey === 'string' && body.buildingCandidateKey.length > 2
      ? body.buildingCandidateKey
      : typeof body.buildingId === 'string'
        ? `building:${body.buildingId}`
        : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
  const buildingId = typeof body.buildingId === 'string' ? body.buildingId : null;
  const source = typeof body.source === 'string' ? body.source : 'organic';

  if (!buildingCandidateKey || buildingCandidateKey.length < 4) {
    return NextResponse.json({ error: 'Invalid building key' }, { status: 400 });
  }
  if (!email.includes('@') && !phone) {
    return NextResponse.json({ error: 'Email or phone required' }, { status: 400 });
  }

  const session = await getSessionUser().catch(() => null);
  const profileId = session?.user?.id ?? null;

  const sb = supabaseAdmin();
  const { error } = await sb.from('building_waitlist').insert({
    building_candidate_key: buildingCandidateKey,
    building_id: buildingId,
    email: email.includes('@') ? email : null,
    phone: phone || null,
    full_name: fullName || null,
    profile_id: profileId,
    notify_email: body.notifyEmail !== false,
    notify_sms: body.notifySms !== false,
  });

  if (error) {
    console.error('building_waitlist', error);
    return NextResponse.json({ error: 'Could not save' }, { status: 500 });
  }

  await sb.from('building_requests').insert({
    building_candidate_key: buildingCandidateKey,
    building_id: buildingId,
    channel: 'waitlist_join',
    source: source === 'ad' || source === 'referral' ? source : 'organic',
    resident_email: email.includes('@') ? email : null,
    resident_phone: phone || null,
    resident_name: fullName || null,
    profile_id: profileId,
    formatted_address: typeof body.formattedAddress === 'string' ? body.formattedAddress : null,
    place_id: typeof body.placeId === 'string' ? body.placeId : null,
    building_display_name: typeof body.buildingName === 'string' ? body.buildingName : null,
  });

  return NextResponse.json({ ok: true });
}
