import { NextRequest, NextResponse } from 'next/server';
import { placeDetails } from '@/lib/places-google';
import { rateLimit, clientIp, rateLimitResponse } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const rl = rateLimit(`places-de:${clientIp(req)}`, { limit: 40, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse(rl);

  const body = await req.json().catch(() => ({}));
  const placeId = typeof body.placeId === 'string' ? body.placeId : '';
  const sessionToken = typeof body.sessionToken === 'string' ? body.sessionToken : undefined;
  if (!placeId) return NextResponse.json({ error: 'placeId required' }, { status: 400 });

  const place = await placeDetails(placeId, sessionToken);
  if (!place) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ place });
}
