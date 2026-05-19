import { NextRequest, NextResponse } from 'next/server';
import { sendBuildingContactOutreachEmail } from '@/lib/email/building-request';
import { rateLimit, clientIp, rateLimitResponse } from '@/lib/rate-limit';

/** @deprecated Use POST /api/building-funnel/submit-request. Kept for backward compatibility. */
export async function POST(req: NextRequest) {
  const rl = rateLimit(`bf-em:${clientIp(req)}`, { limit: 5, windowMs: 300_000 });
  if (!rl.ok) return rateLimitResponse(rl);

  const body = await req.json().catch(() => ({}));
  const mgmtEmail = typeof body.mgmtEmail === 'string' ? body.mgmtEmail.trim() : '';
  const buildingName = typeof body.buildingName === 'string' ? body.buildingName.trim() : '';
  const residentEmail = typeof body.residentEmail === 'string' ? body.residentEmail.trim() : '';

  if (!mgmtEmail.includes('@')) return NextResponse.json({ error: 'Valid management email required' }, { status: 400 });
  if (!residentEmail.includes('@')) return NextResponse.json({ error: 'Your email required' }, { status: 400 });

  const sent = await sendBuildingContactOutreachEmail({
    mgmtEmail,
    mgmtContactName: typeof body.mgmtContactName === 'string' ? body.mgmtContactName : null,
    buildingLabel: buildingName || null,
    formattedAddress: typeof body.formattedAddress === 'string' ? body.formattedAddress : null,
  });

  if (!sent) return NextResponse.json({ error: 'Send failed' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
