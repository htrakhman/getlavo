import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit, clientIp, rateLimitResponse } from '@/lib/rate-limit';
import { sendInternalBuildingRequestEmail } from '@/lib/email/building-request';

export async function POST(req: NextRequest) {
  const rl = rateLimit(`ho-wl:${clientIp(req)}`, { limit: 10, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse(rl);

  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const partnerSlug = typeof body.partnerSlug === 'string' ? body.partnerSlug.trim() : null;
  const placeId = typeof body.placeId === 'string' ? body.placeId : null;
  if (!email.includes('@')) return NextResponse.json({ error: 'Valid email required' }, { status: 400 });

  const sb = supabaseAdmin();
  const { error } = await sb.from('homeowner_waitlist').insert({ email, partner_slug: partnerSlug, place_id: placeId });
  if (error) return NextResponse.json({ error: 'Could not save' }, { status: 500 });

  await sb.from('building_requests').insert({
    building_candidate_key: `homeowner:${email.toLowerCase()}`,
    channel: 'homeowner_waitlist',
    source: 'organic',
    resident_email: email,
    place_id: placeId,
  });

  const submittedAt = new Date().toISOString();
  const internalEmailSent = await sendInternalBuildingRequestEmail({
    residentEmail: email,
    residentFirstName: null,
    buildingLabel: partnerSlug ? `Homeowner lead (${partnerSlug})` : 'Homeowner lead',
    formattedAddress: null,
    mgmtContactName: null,
    mgmtEmail: null,
    notes: placeId ? `place_id: ${placeId}` : 'Homeowner waitlist signup',
    source: 'organic',
    submittedAt,
    shareUrl: 'Not created',
  }).catch((e) => {
    console.error('sendInternalBuildingRequestEmail (homeowner waitlist)', e);
    return false;
  });

  return NextResponse.json({ ok: true, internalEmailSent });
}
