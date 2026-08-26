import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, clientIp, rateLimitResponse } from '@/lib/rate-limit';
import { normalizeAddressQuery } from '@/lib/geo';

export async function GET(req: NextRequest) {
  const rl = rateLimit(`addr-suggest:${clientIp(req)}`, { limit: 60, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse(rl);

  const q = req.nextUrl.searchParams.get('q') ?? '';
  if (q.trim().length < 3) return NextResponse.json({ features: [] });

  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(normalizeAddressQuery(q).slice(0, 200))}&limit=10&lang=en&countrycode=us`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'getlavo/1.0' } });
    if (!res.ok) return NextResponse.json({ features: [] });
    const data = await res.json();
    return NextResponse.json({ features: data.features ?? [] });
  } catch {
    return NextResponse.json({ features: [] });
  }
}
