import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { randomShareToken } from '@/lib/building-candidate';
import { rateLimit, clientIp, rateLimitResponse } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const rl = rateLimit(`bsh:${clientIp(req)}`, { limit: 20, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse(rl);

  const body = await req.json().catch(() => ({}));
  const buildingCandidateKey = typeof body.buildingCandidateKey === 'string' ? body.buildingCandidateKey : '';
  const buildingId = typeof body.buildingId === 'string' ? body.buildingId : null;
  if (!buildingCandidateKey) return NextResponse.json({ error: 'key required' }, { status: 400 });

  const token = randomShareToken(10);
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from('building_share_links')
    .insert({
      token,
      building_candidate_key: buildingCandidateKey,
      building_id: buildingId,
    })
    .select('token')
    .single();

  if (error || !data) {
    console.error('building_share_links', error);
    return NextResponse.json({ error: 'Could not create link' }, { status: 500 });
  }

  const origin = req.headers.get('x-forwarded-host')
    ? `${req.headers.get('x-forwarded-proto') ?? 'https'}://${req.headers.get('x-forwarded-host')}`
    : process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  return NextResponse.json({ token: data.token, url: `${origin}/join/${data.token}` });
}
