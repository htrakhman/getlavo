import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { randomShareToken } from '@/lib/building-candidate';
import {
  sendInternalBuildingRequestEmail,
  sendBuildingContactOutreachEmail,
  userBuildingLabel,
} from '@/lib/email/building-request';
import { insertBuildingRequestRow } from '@/lib/building-request-insert';
import { rateLimit, clientIp, rateLimitResponse } from '@/lib/rate-limit';
import { getSessionUser } from '@/lib/supabase/server';

function appOrigin(req: NextRequest) {
  const host = req.headers.get('x-forwarded-host');
  if (host) {
    return `${req.headers.get('x-forwarded-proto') ?? 'https'}://${host}`;
  }
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(`bfsr:${clientIp(req)}`, { limit: 10, windowMs: 300_000 });
  if (!rl.ok) return rateLimitResponse(rl);

  const body = await req.json().catch(() => ({}));
  const buildingCandidateKey =
    typeof body.buildingCandidateKey === 'string' ? body.buildingCandidateKey.trim() : '';
  const residentEmail = typeof body.residentEmail === 'string' ? body.residentEmail.trim() : '';
  const buildingLabel = typeof body.buildingLabel === 'string' ? body.buildingLabel.trim() : '';
  const residentFirstName =
    typeof body.residentFirstName === 'string' ? body.residentFirstName.trim() : '';
  const mgmtEmail = typeof body.mgmtEmail === 'string' ? body.mgmtEmail.trim() : '';
  const mgmtContactName =
    typeof body.mgmtContactName === 'string' ? body.mgmtContactName.trim() : '';
  const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
  const buildingId = typeof body.buildingId === 'string' ? body.buildingId : null;
  const placeId = typeof body.placeId === 'string' ? body.placeId : null;
  const formattedAddress =
    typeof body.formattedAddress === 'string' ? body.formattedAddress.trim() : '';
  const channel: 'neighbor_share' | 'building_request' =
    body.channel === 'neighbor_share' ? 'neighbor_share' : 'building_request';
  const source: 'organic' | 'ad' | 'referral' =
    body.source === 'ad' || body.source === 'referral' ? body.source : 'organic';

  if (!buildingCandidateKey || buildingCandidateKey.length < 4) {
    return NextResponse.json({ error: 'Invalid building key' }, { status: 400 });
  }
  if (!residentEmail.includes('@')) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
  }
  if (!buildingLabel) {
    return NextResponse.json({ error: 'Building name or address required' }, { status: 400 });
  }

  const session = await getSessionUser().catch(() => null);
  const profileId = session?.user?.id ?? null;
  const sb = supabaseAdmin();
  const submittedAt = new Date().toISOString();

  const { error: waitlistError } = await sb.from('building_waitlist').insert({
    building_candidate_key: buildingCandidateKey,
    building_id: buildingId,
    email: residentEmail,
    full_name: residentFirstName || null,
    profile_id: profileId,
    notify_email: true,
    notify_sms: false,
  });

  if (waitlistError) {
    console.error('building_waitlist submit-request', waitlistError);
    return NextResponse.json({ error: 'Could not save request' }, { status: 500 });
  }

  const requestRow = await insertBuildingRequestRow(sb, {
    building_candidate_key: buildingCandidateKey,
    building_id: buildingId,
    channel,
    source,
    place_id: placeId,
    formatted_address: formattedAddress || null,
    building_display_name: buildingLabel,
    resident_name: residentFirstName || null,
    resident_email: residentEmail,
    mgmt_email: mgmtEmail.includes('@') ? mgmtEmail : null,
    mgmt_contact_name: mgmtContactName || null,
    notes: notes || null,
    profile_id: profileId,
  });

  if (!requestRow) {
    return NextResponse.json({ error: 'Could not log request' }, { status: 500 });
  }

  const token = randomShareToken(10);
  const { data: shareRow, error: shareError } = await sb
    .from('building_share_links')
    .insert({
      token,
      building_candidate_key: buildingCandidateKey,
      building_id: buildingId,
      created_by_request_id: requestRow.id,
    })
    .select('token')
    .single();

  if (shareError || !shareRow) {
    console.error('building_share_links submit-request', shareError);
    return NextResponse.json({ error: 'Could not create share link' }, { status: 500 });
  }

  const shareUrl = `${appOrigin(req)}/join/${shareRow.token}`;
  const displayLabel = userBuildingLabel(buildingLabel, formattedAddress);

  const emailPayload = {
    residentEmail,
    residentFirstName: residentFirstName || null,
    buildingLabel,
    formattedAddress: formattedAddress || null,
    mgmtContactName: mgmtContactName || null,
    mgmtEmail: mgmtEmail.includes('@') ? mgmtEmail : null,
    notes: notes || null,
    source,
    submittedAt,
    shareUrl,
  };

  const internalEmailSent = await sendInternalBuildingRequestEmail(emailPayload);

  let mgmtEmailSent = false;
  if (mgmtEmail.includes('@')) {
    mgmtEmailSent = await sendBuildingContactOutreachEmail({
      mgmtEmail,
      mgmtContactName: mgmtContactName || null,
      buildingLabel,
      formattedAddress: formattedAddress || null,
    });
    if (mgmtEmailSent) {
      await sb
        .from('building_requests')
        .update({ mgmt_email_sent_at: submittedAt })
        .eq('id', requestRow.id);
    }
  }

  return NextResponse.json({
    ok: true,
    shareUrl,
    buildingLabel: displayLabel,
    mgmtEmailSent,
    events: {
      internalEmailSent,
      buildingContactEmailSent: mgmtEmailSent,
    },
  });
}
