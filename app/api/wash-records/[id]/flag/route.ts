import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { notify } from '@/lib/notify';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { reason, notes } = await req.json().catch(() => ({}));
  const sb = supabaseAdmin();

  const { data: wash } = await sb
    .from('washes')
    .select('resident:residents(profile_id)')
    .eq('id', params.id)
    .maybeSingle();

  await sb.from('washes').update({
    status: 'flagged',
    flag_reason: reason,
    crew_notes: notes ?? null,
  }).eq('id', params.id);

  const profileId = (wash?.resident as any)?.profile_id;
  if (profileId) {
    await notify(profileId, 'wash_flagged', { reason });
  }

  // Best-effort admin email
  if (process.env.ADMIN_EMAIL && process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'Lavo <hello@getlavo.io>',
        to: process.env.ADMIN_EMAIL,
        subject: 'Wash flagged',
        html: `<p>A wash record was flagged.</p><p>Reason: ${reason}</p><p>Notes: ${notes ?? ''}</p>`,
      });
    } catch {}
  }

  return NextResponse.json({ success: true });
}
