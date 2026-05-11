import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit, clientIp, rateLimitResponse } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const rl = rateLimit(`building-interest:${clientIp(req)}`, { limit: 5, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse(rl);

  const body = await req.json().catch(() => ({}));
  const { building, buildingId, email } = body ?? {};

  const sb = supabaseAdmin();

  // /b/[slug] notify-me form: buildingId + email
  if (buildingId && typeof email === 'string' && email.includes('@')) {
    const { error } = await sb
      .from('building_interest')
      .insert({ building_id: buildingId, email: email.trim() });
    if (error) console.error('building_interest insert error:', error.message);
    return NextResponse.json({ ok: true });
  }

  // Marketing form: building name only
  if (!building || typeof building !== 'string' || building.trim().length < 2) {
    return NextResponse.json({ error: 'Building name required' }, { status: 400 });
  }

  const { error } = await sb
    .from('building_interest')
    .insert({ building_name: building.trim() });

  if (error) console.error('building_interest insert error:', error.message);
  return NextResponse.json({ ok: true });
}
