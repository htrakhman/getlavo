import { NextResponse } from 'next/server';
import { verifyTurnstile } from '@/lib/turnstile';
import { rateLimit, clientIp, rateLimitResponse } from '@/lib/rate-limit';

export async function POST(req: Request) {
  const rl = rateLimit(`captcha:${clientIp(req)}`, { limit: 30, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse(rl);

  const { token } = await req.json().catch(() => ({}));
  const ok = await verifyTurnstile(token, clientIp(req));
  if (!ok) return NextResponse.json({ error: 'failed' }, { status: 400 });
  return NextResponse.json({ ok: true });
}
