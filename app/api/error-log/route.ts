import { NextResponse } from 'next/server';
import { logError } from '@/lib/error-log';
import { rateLimit, clientIp, rateLimitResponse } from '@/lib/rate-limit';

// Endpoint the client error boundary posts to so server-side has a record.
export async function POST(req: Request) {
  const rl = rateLimit(`error-log:${clientIp(req)}`, { limit: 30, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse(rl);

  const body = await req.json().catch(() => ({}));
  await logError({
    source: body.source ?? 'client',
    message: String(body.message ?? '').slice(0, 1000),
    stack: body.stack,
    context: body.context,
  });
  return NextResponse.json({ ok: true });
}
