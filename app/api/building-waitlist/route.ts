import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit, clientIp, rateLimitResponse } from '@/lib/rate-limit';
import { getSessionUser } from '@/lib/supabase/server';
import { insertBuildingWaitlistRow } from '@/lib/building-waitlist-insert';
import {
  sendWaitlistJoinConfirmation,
  wasAlreadyOnBuildingWaitlist,
} from '@/lib/building-waitlist-email';

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
  const buildingLabel =
    typeof body.buildingName === 'string'
      ? body.buildingName.trim()
      : typeof body.buildingLabel === 'string'
        ? body.buildingLabel.trim()
        : '';
  const formattedAddress =
    typeof body.formattedAddress === 'string' ? body.formattedAddress.trim() : '';

  if (email.includes('@')) {
    const notifyEmail = body.notifyEmail !== false;
    const alreadyOnWaitlist = await wasAlreadyOnBuildingWaitlist(
      sb,
      email,
      buildingCandidateKey,
      buildingId,
    );

    const waitlistResult = await insertBuildingWaitlistRow(sb, {
      building_candidate_key: buildingCandidateKey,
      building_id: buildingId,
      email,
      full_name: fullName || null,
      profile_id: profileId,
      building_label: buildingLabel || 'Unknown building',
      formatted_address: formattedAddress || null,
      notify_email: notifyEmail,
      notify_sms: body.notifySms !== false,
    });

    if (!waitlistResult.ok) {
      return NextResponse.json({ error: 'Could not save' }, { status: 500 });
    }

    if (!alreadyOnWaitlist && notifyEmail) {
      await sendWaitlistJoinConfirmation({
        sb,
        email,
        buildingId,
        buildingLabel: buildingLabel || 'Unknown building',
        formattedAddress: formattedAddress || null,
        firstName: fullName || null,
      }).catch((e) => console.error('waitlist confirmation email', e));
    }

    if (phone) {
      await sb
        .from('building_waitlist')
        .update({ phone })
        .eq('building_candidate_key', buildingCandidateKey)
        .eq('email', email);
    }
  } else {
    const { error } = await sb.from('building_waitlist').insert({
      building_candidate_key: buildingCandidateKey,
      building_id: buildingId,
      email: null,
      phone: phone || null,
      full_name: fullName || null,
      profile_id: profileId,
      notify_email: body.notifyEmail !== false,
      notify_sms: body.notifySms !== false,
    });
    if (error) {
      console.error('building_waitlist phone-only', error);
      return NextResponse.json({ error: 'Could not save' }, { status: 500 });
    }
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
