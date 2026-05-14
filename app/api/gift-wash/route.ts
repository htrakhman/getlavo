import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { randomShareToken } from '@/lib/building-candidate';

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const recipientEmail = typeof body.recipientEmail === 'string' ? body.recipientEmail.trim() : '';
  const amountCents = typeof body.amountCents === 'number' ? body.amountCents : 3500;
  if (!recipientEmail.includes('@')) return NextResponse.json({ error: 'recipient email required' }, { status: 400 });

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

  return NextResponse.json({ code, message: 'Share this code with your neighbor.' });
}
