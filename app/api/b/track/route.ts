import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser } from '@/lib/supabase/server';
import { logScanEvent } from '@/lib/qr-attribution';
import { rateLimit } from '@/lib/rate-limit';

const Body = z.object({
  slug: z.string().min(1).max(120),
  event: z.enum(['page_view', 'signup']),
});

/** Client-side attribution beacon for the building QR funnel. */
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!rateLimit(`b-track:${ip}`, { limit: 30, windowMs: 60_000 }).ok) {
    return NextResponse.json({ ok: true });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  const session = await getSessionUser().catch(() => null);
  await logScanEvent({
    slug: parsed.data.slug,
    event: parsed.data.event,
    profileId: session?.user.id ?? null,
    userAgent: req.headers.get('user-agent'),
    referrer: req.headers.get('referer'),
  });
  return NextResponse.json({ ok: true });
}
