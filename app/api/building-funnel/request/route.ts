import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit, clientIp, rateLimitResponse } from '@/lib/rate-limit';

/** Log a funnel step for analytics and ops dashboards. */
export async function POST(req: NextRequest) {
  const rl = rateLimit(`bfr:${clientIp(req)}`, { limit: 40, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse(rl);

  const body = await req.json().catch(() => ({}));
  const buildingCandidateKey = typeof body.buildingCandidateKey === 'string' ? body.buildingCandidateKey : '';
  if (!buildingCandidateKey) return NextResponse.json({ error: 'key required' }, { status: 400 });

  const sb = supabaseAdmin();
  const { error } = await sb.from('building_requests').insert({
    building_candidate_key: buildingCandidateKey,
    building_id: typeof body.buildingId === 'string' ? body.buildingId : null,
    channel: body.channel === 'neighbor_share' ? 'neighbor_share' : 'check_flow',
    source: body.source === 'ad' || body.source === 'referral' ? body.source : 'organic',
    place_id: typeof body.placeId === 'string' ? body.placeId : null,
    formatted_address: typeof body.formattedAddress === 'string' ? body.formattedAddress : null,
    building_display_name: typeof body.buildingName === 'string' ? body.buildingName : null,
    vehicle_json: typeof body.vehicle === 'object' && body.vehicle ? body.vehicle : null,
    unit: typeof body.unit === 'string' ? body.unit : null,
    resident_name: typeof body.residentName === 'string' ? body.residentName : null,
    resident_email: typeof body.residentEmail === 'string' ? body.residentEmail : null,
    resident_phone: typeof body.residentPhone === 'string' ? body.residentPhone : null,
    mgmt_email: typeof body.mgmtEmail === 'string' ? body.mgmtEmail : null,
  });

  if (error) {
    console.error('building_requests', error);
    return NextResponse.json({ error: 'log failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
