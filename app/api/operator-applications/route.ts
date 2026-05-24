import { NextResponse } from 'next/server';
import { sendOperatorApplicationEmail } from '@/lib/email/operator-application';
import { rateLimit, clientIp, rateLimitResponse } from '@/lib/rate-limit';

export async function POST(req: Request) {
  const rl = rateLimit(`operator-app:${clientIp(req)}`, { limit: 5, windowMs: 3600_000 });
  if (!rl.ok) return rateLimitResponse(rl);

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const company = typeof body.company === 'string' ? body.company.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const serviceArea = typeof body.serviceArea === 'string' ? body.serviceArea.trim() : '';
  const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
  const source = typeof body.source === 'string' ? body.source.trim() : '';
  const citySlug = typeof body.citySlug === 'string' ? body.citySlug.trim() : '';
  const insured = body.insured === true;

  if (!name || !company || !email.includes('@') || !serviceArea) {
    return NextResponse.json({ error: 'Please fill in all required fields.' }, { status: 400 });
  }

  const sent = await sendOperatorApplicationEmail({
    name,
    company,
    email,
    phone: phone || undefined,
    serviceArea,
    insured,
    notes: notes || undefined,
    source: source || undefined,
    citySlug: citySlug || undefined,
    submittedAt: new Date().toISOString(),
  });

  if (!sent) {
    return NextResponse.json(
      { error: 'Could not send application. Email harold@getlavo.io directly.' },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true });
}
