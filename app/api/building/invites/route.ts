import { NextResponse } from 'next/server';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import crypto from 'crypto';
import { wrapEmail, escape } from '@/lib/email/template';

type InviteInput = { email: string; fullName?: string; unitNumber?: string };

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = supabaseServer();
  const { data: building } = await sb
    .from('buildings')
    .select('id, name, slug')
    .eq('manager_id', session.user.id)
    .limit(1)
    .maybeSingle();
  if (!building) return NextResponse.json({ error: 'no building' }, { status: 404 });

  const { invites } = (await req.json()) as { invites: InviteInput[] };
  if (!Array.isArray(invites) || invites.length === 0) {
    return NextResponse.json({ error: 'no invites' }, { status: 400 });
  }

  const cleaned = invites
    .map((i) => ({
      email: (i.email ?? '').trim().toLowerCase(),
      full_name: (i.fullName ?? '').trim() || null,
      unit_number: (i.unitNumber ?? '').trim() || null,
    }))
    .filter((i) => i.email.includes('@'));

  if (cleaned.length === 0) return NextResponse.json({ error: 'no valid emails' }, { status: 400 });

  const admin = supabaseAdmin();
  const rows = cleaned.map((c) => ({
    building_id: building.id,
    invited_by: session.user.id,
    email: c.email,
    full_name: c.full_name,
    unit_number: c.unit_number,
    token: crypto.randomBytes(16).toString('hex'),
  }));

  const { data: inserted, error } = await admin.from('building_invites').insert(rows).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Send invite emails (best-effort)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      await Promise.all(
        (inserted ?? []).map((row: any) => {
          const link = `${appUrl}/b/${building.slug}?invite=${row.token}`;
          return resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'Lavo <hello@getlavo.io>',
            to: row.email,
            subject: `Car wash service at ${building.name}`,
            html: invitationHtml({
              buildingName: building.name,
              fullName: row.full_name,
              link,
            }),
          });
        }),
      );
    } catch (e) {
      console.error('invite email error:', e);
    }
  }

  return NextResponse.json({ sent: inserted?.length ?? 0 });
}

function invitationHtml({ buildingName, fullName, link }: { buildingName: string; fullName: string | null; link: string }) {
  const greet = fullName ? `Hi ${escape(fullName)},` : 'Hello neighbor,';
  const inner = `
    <p style="margin:0 0 16px 0;">${greet}</p>
    <p style="margin:0 0 16px 0;">Your building, <strong>${escape(buildingName)}</strong>, has partnered with Lavo to bring in-garage car washing to residents.</p>
    <p style="margin:0 0 16px 0;">No more leaving the garage. The crew comes to your spot on wash day.</p>
    <p style="margin:24px 0;">
      <a href="${link}" style="display:inline-block;padding:14px 24px;background:#00e5c8;color:#000;font-weight:600;text-decoration:none;border-radius:9999px;">
        Sign up &amp; get your first wash →
      </a>
    </p>
    <p style="font-size:12px;color:#666;">If the button doesn't work, paste this link: ${link}</p>
  `;
  return wrapEmail({ preheader: `In-garage car washing comes to ${buildingName}`, content: inner });
}
