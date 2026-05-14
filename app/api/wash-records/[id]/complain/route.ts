import { NextResponse } from 'next/server';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { audit } from '@/lib/audit';
import { escapeHtml } from '@/lib/html';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { reason, details } = await req.json();

  const sb = supabaseServer();
  const { data: resident } = await sb.from('residents').select('id').eq('profile_id', session.user.id).maybeSingle();
  if (!resident) return NextResponse.json({ error: 'no resident' }, { status: 404 });

  const admin = supabaseAdmin();
  const { data: wash } = await admin
    .from('washes')
    .select('id, resident_id, wash_day:wash_days(building_id)')
    .eq('id', params.id)
    .maybeSingle();
  if (!wash || wash.resident_id !== resident.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const buildingId = (wash.wash_day as any)?.building_id;
  if (buildingId) {
    await admin.from('issues').insert({
      building_id: buildingId,
      reporter_id: session.user.id,
      type: `Complaint: ${reason}`,
      description: details ? `${reason}\n\n${details}\n\nWash: ${params.id}` : `${reason}\n\nWash: ${params.id}`,
    });
  }

  // Email admin
  if (process.env.ADMIN_EMAIL && process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'Lavo <hello@getlavo.io>',
        to: process.env.ADMIN_EMAIL,
        subject: `Resident complaint: ${reason}`,
        html: `<p>${escapeHtml(details ?? '')}</p><p>Wash: ${escapeHtml(params.id)}</p><p>Resident: ${escapeHtml(session.profile.email)}</p>`,
      });
    } catch {}
  }

  await audit({
    actorId: session.user.id,
    actorRole: 'resident',
    action: 'wash.complaint',
    entityType: 'wash',
    entityId: params.id,
    metadata: { reason, details },
  });

  return NextResponse.json({ success: true });
}
