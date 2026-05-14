import { NextResponse } from 'next/server';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { wrapEmail, paragraph, button } from '@/lib/email/template';

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const subject = typeof body.subject === 'string' ? body.subject : '';
  const text = typeof body.body === 'string' ? body.body : '';
  const channels: string[] = Array.isArray(body.channels) ? body.channels : ['email'];

  if (!subject || !text) return NextResponse.json({ error: 'subject and body required' }, { status: 400 });

  const sb = supabaseServer();
  const { data: b } = await sb.from('buildings').select('id, name, manager_id').eq('manager_id', session.user.id).limit(1).maybeSingle();
  if (!b) return NextResponse.json({ error: 'no building' }, { status: 404 });

  const admin = supabaseAdmin();
  const { data: residents } = await admin.from('residents').select('profile_id').eq('building_id', b.id);
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, email')
    .in(
      'id',
      (residents ?? []).map((r) => r.profile_id).filter(Boolean),
    );

  const from = process.env.RESEND_FROM_EMAIL || 'Lavo <hello@getlavo.io>';
  if (channels.includes('email') && process.env.RESEND_API_KEY && profiles?.length) {
    const Resend = (await import('resend')).Resend;
    const resend = new Resend(process.env.RESEND_API_KEY);
    const inner = [paragraph(text.replace(/\n/g, '<br/>'))].join('');
    for (const p of profiles) {
      if (!p.email) continue;
      await resend.emails.send({
        from,
        to: p.email,
        subject,
        html: wrapEmail({ preheader: subject, content: inner }),
      });
    }
  }

  await admin.from('building_broadcasts').insert({
    building_id: b.id,
    sent_by: session.user.id,
    subject,
    body: text,
    channels,
  });

  return NextResponse.json({ ok: true, sent: profiles?.length ?? 0 });
}
