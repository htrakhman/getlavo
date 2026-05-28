import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit, clientIp, rateLimitResponse } from '@/lib/rate-limit';
import { sendInternalBuildingRequestEmail } from '@/lib/email/building-request';

export async function POST(req: Request) {
  const rl = rateLimit(`ent-lead:${clientIp(req)}`, { limit: 10, windowMs: 3600_000 });
  if (!rl.ok) return rateLimitResponse(rl);

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const company = typeof body.company === 'string' ? body.company.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const portfolioSize = typeof body.portfolioSize === 'string' ? body.portfolioSize.trim() : '';
  if (!name || !company || !email.includes('@')) return NextResponse.json({ error: 'invalid' }, { status: 400 });

  const admin = supabaseAdmin();
  const { error } = await admin.from('enterprise_leads').insert({
    name,
    company,
    email,
    portfolio_size: portfolioSize,
    notes: typeof body.notes === 'string' ? body.notes : null,
  });
  if (error) return NextResponse.json({ error: 'save failed' }, { status: 500 });

  const submittedAt = new Date().toISOString();
  const internalEmailSent = await sendInternalBuildingRequestEmail({
    residentEmail: email,
    residentFirstName: name,
    buildingLabel: `Enterprise lead (${company})`,
    formattedAddress: null,
    mgmtContactName: name,
    mgmtEmail: email,
    notes: [
      portfolioSize ? `portfolio_size: ${portfolioSize}` : null,
      typeof body.notes === 'string' && body.notes.trim() ? `notes: ${body.notes.trim()}` : null,
    ]
      .filter(Boolean)
      .join('\n'),
    source: 'enterprise',
    submittedAt,
    shareUrl: 'Not created',
  }).catch((e) => {
    console.error('sendInternalBuildingRequestEmail (enterprise)', e);
    return false;
  });

  return NextResponse.json({ ok: true, internalEmailSent });
}
