import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { wrapEmail, paragraph } from '@/lib/email/template';
import { rateLimit, clientIp, rateLimitResponse } from '@/lib/rate-limit';
import { getSessionUser } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const rl = rateLimit(`bf-em:${clientIp(req)}`, { limit: 5, windowMs: 300_000 });
  if (!rl.ok) return rateLimitResponse(rl);

  const body = await req.json().catch(() => ({}));
  const mgmtEmail = typeof body.mgmtEmail === 'string' ? body.mgmtEmail.trim() : '';
  const buildingName = typeof body.buildingName === 'string' ? body.buildingName.trim() : 'My building';
  const residentName = typeof body.residentName === 'string' ? body.residentName.trim() : 'A resident';
  const residentEmail = typeof body.residentEmail === 'string' ? body.residentEmail.trim() : '';
  const candidateKey = typeof body.buildingCandidateKey === 'string' ? body.buildingCandidateKey : '';
  const placeId = typeof body.placeId === 'string' ? body.placeId : null;

  if (!mgmtEmail.includes('@')) return NextResponse.json({ error: 'Valid management email required' }, { status: 400 });
  if (!residentEmail.includes('@')) return NextResponse.json({ error: 'Your email required' }, { status: 400 });

  const session = await getSessionUser().catch(() => null);
  const profileId = session?.user?.id ?? null;
  const sb = supabaseAdmin();

  const subject = `Free amenity request from a resident at ${buildingName}`;
  const inner = [
    paragraph(`Hi,`),
    paragraph(
      `I'm a resident at ${buildingName}. I'd love our building to offer Lavo mobile car washes as an amenity. Residents book on their phone. Operators are background checked and insured. It costs the building nothing.`,
    ),
    paragraph(`You can learn more at getlavo.io.`),
    paragraph(`Thanks,<br/>${residentName.replace(/</g, '')}`),
  ].join('');

  const from = process.env.MGMT_PROXY_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || 'Lavo <hello@getlavo.io>';

  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from,
        to: mgmtEmail,
        replyTo: residentEmail,
        subject,
        html: wrapEmail({
          preheader: `Resident request for Lavo at ${buildingName}`,
          content: inner,
        }),
      });
    } catch (e) {
      console.error('email-mgmt send', e);
      return NextResponse.json({ error: 'Send failed' }, { status: 500 });
    }
  } else {
    console.warn('RESEND_API_KEY missing; skipping management email');
  }

  await sb.from('building_requests').insert({
    building_candidate_key: candidateKey || 'unknown',
    channel: 'email_mgmt',
    source: 'organic',
    mgmt_email: mgmtEmail,
    mgmt_email_sent_at: new Date().toISOString(),
    building_display_name: buildingName,
    resident_name: residentName,
    resident_email: residentEmail,
    place_id: placeId,
    profile_id: profileId,
  });

  return NextResponse.json({ ok: true });
}
