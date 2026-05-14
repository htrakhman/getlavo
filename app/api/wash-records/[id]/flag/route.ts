import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { notify } from '@/lib/notify';
import { loadWashForOperator } from '@/lib/auth/wash-ownership';
import { escapeHtml } from '@/lib/html';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { reason, notes } = await req.json().catch(() => ({}));

  const admin = supabaseAdmin();
  const check = await loadWashForOperator(admin, params.id, session.user.id);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  await admin.from('washes').update({
    status: 'flagged',
    flag_reason: reason,
    crew_notes: notes ?? null,
  }).eq('id', params.id);

  if (check.ctx.residentProfileId) {
    await notify(check.ctx.residentProfileId, 'wash_flagged', { reason });
  }

  if (process.env.ADMIN_EMAIL && process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'Lavo <hello@getlavo.io>',
        to: process.env.ADMIN_EMAIL,
        subject: 'Wash flagged',
        html: `<p>A wash record was flagged.</p><p>Reason: ${escapeHtml(reason)}</p><p>Notes: ${escapeHtml(notes ?? '')}</p>`,
      });
    } catch {}
  }

  return NextResponse.json({ success: true });
}
