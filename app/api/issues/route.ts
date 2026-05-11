import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const { buildingId, type, description } = await req.json();
  if (!buildingId || !type || !description) {
    return NextResponse.json({ error: 'missing fields' }, { status: 400 });
  }
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: issue, error } = await sb.from('issues').insert({
    building_id: buildingId,
    reporter_id: user.id,
    type,
    description,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (process.env.ADMIN_EMAIL && process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'Lavo <hello@getlavo.io>',
        to: process.env.ADMIN_EMAIL,
        subject: `New issue: ${type}`,
        html: `<p>${description}</p><p>Building: ${buildingId}</p>`,
      });
    } catch {}
  }

  return NextResponse.json({ issueId: issue.id });
}
