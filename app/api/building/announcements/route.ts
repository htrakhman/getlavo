import { NextResponse } from 'next/server';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { wrapEmail, paragraph, escape } from '@/lib/email/template';
import { audit } from '@/lib/audit';

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { buildingId, subject, body } = await req.json();
  if (!buildingId || !subject?.trim() || !body?.trim()) {
    return NextResponse.json({ error: 'missing fields' }, { status: 400 });
  }

  const sb = supabaseServer();
  const { data: building } = await sb
    .from('buildings')
    .select('id, name')
    .eq('id', buildingId)
    .eq('manager_id', session.user.id)
    .maybeSingle();
  if (!building) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const admin = supabaseAdmin();
  const { data: residents } = await admin
    .from('residents')
    .select('profile_id, profile:profiles!profile_id(email, full_name)')
    .eq('building_id', buildingId);

  // In-app notifications for everyone
  const notifs = (residents ?? []).map((r: any) => ({
    recipient_id: r.profile_id,
    kind: 'announcement',
    title: subject,
    body,
    link: '/resident/washes',
  }));
  if (notifs.length) await admin.from('notifications').insert(notifs);

  // Email blast
  let sent = 0;
  if (process.env.RESEND_API_KEY && residents?.length) {
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      const html = wrapEmail({
        preheader: subject,
        content: [
          paragraph(`A note from your property manager at ${building.name}:`),
          `<div style="margin:0 0 16px 0;white-space:pre-wrap;">${escape(body)}</div>`,
        ].join(''),
      });
      const results = await Promise.all(
        residents
          .filter((r: any) => r.profile?.email)
          .map((r: any) =>
            resend.emails.send({
              from: process.env.RESEND_FROM_EMAIL || 'Lavo <hello@getlavo.io>',
              to: r.profile.email,
              subject: `[${building.name}] ${subject}`,
              html,
            }).catch(() => null),
          ),
      );
      sent = results.filter(Boolean).length;
    } catch (e) {
      console.error('announcement email error', e);
    }
  }

  const { data: announcement } = await admin.from('announcements').insert({
    building_id: buildingId,
    author_id: session.user.id,
    subject,
    body,
    sent_count: residents?.length ?? 0,
  }).select().single();

  await audit({
    actorId: session.user.id,
    actorRole: session.profile.role,
    action: 'announcement.send',
    entityType: 'building',
    entityId: buildingId,
    metadata: { subject, recipients: residents?.length ?? 0, emailed: sent },
  });

  return NextResponse.json({ announcementId: announcement?.id, recipients: residents?.length ?? 0, emailed: sent });
}
