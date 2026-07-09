import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { randomShareToken } from '@/lib/building-candidate';
import { wrapEmail, button, paragraph } from '@/lib/email/template';

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const recipientEmail = typeof body.recipientEmail === 'string' ? body.recipientEmail.trim() : '';
  const recipientName = typeof body.recipientName === 'string' ? body.recipientName.trim() : '';
  const amountCents = typeof body.amountCents === 'number' ? body.amountCents : 3500;

  if (!recipientEmail.includes('@')) return NextResponse.json({ error: 'recipient email required' }, { status: 400 });
  if (!recipientName) return NextResponse.json({ error: 'recipient name required' }, { status: 400 });

  const admin = supabaseAdmin();
  const code = `GIFT-${randomShareToken(8).toUpperCase()}`;
  const { data: promo, error: pe } = await admin
    .from('promo_codes')
    .insert({
      code,
      description: 'Gift wash credit',
      discount_kind: 'fixed_cents',
      discount_amount_cents: amountCents,
      applies_first_booking_only: false,
      max_redemptions: 1,
      active: true,
    })
    .select('id')
    .single();
  if (pe || !promo) return NextResponse.json({ error: 'could not create gift' }, { status: 500 });

  await admin.from('gift_wash_credits').insert({
    sender_profile_id: session.user.id,
    recipient_email: recipientEmail,
    amount_cents: amountCents,
    promo_code_id: promo.id,
  });

  // Send gift email to recipient
  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      const senderName = session.profile.full_name || session.profile.email;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://getlavo.io';
      const dollarAmount = `$${(amountCents / 100).toFixed(0)}`;

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'Lavo <hello@getlavo.io>',
        to: recipientEmail,
        subject: `${senderName} sent you a free car wash on Lavo`,
        html: wrapEmail({
          preheader: `You've got a ${dollarAmount} gift wash waiting for you.`,
          content: [
            paragraph(`Hi ${recipientName},`),
            paragraph(`${senderName} sent you a gift — a ${dollarAmount} car wash credit on Lavo, the on-demand car wash service for your building.`),
            paragraph(`Use code <strong style="color:#00e5c8;letter-spacing:0.05em;">${code}</strong> at checkout when you book your first wash.`),
            button(`${appUrl}/resident/book`, 'Book your free wash →'),
            paragraph(`This code is valid for one use. Enjoy!`),
          ].join(''),
        }),
      });
    } catch {}
  }

  return NextResponse.json({ ok: true, message: 'Gift sent successfully.' });
}
