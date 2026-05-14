import { NextRequest, NextResponse } from 'next/server';
import { placesAutocomplete } from '@/lib/places-google';
import { rateLimit, clientIp, rateLimitResponse } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const rl = rateLimit(`places-ac:${clientIp(req)}`, { limit: 30, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse(rl);

  const body = await req.json().catch(() => ({}));
  const input = typeof body.input === 'string' ? body.input : '';
  const sessionToken = typeof body.sessionToken === 'string' ? body.sessionToken : undefined;
  if (input.length < 3) return NextResponse.json({ predictions: [] });

  const predictions = await placesAutocomplete(input, sessionToken);
  return NextResponse.json({ predictions });
}
