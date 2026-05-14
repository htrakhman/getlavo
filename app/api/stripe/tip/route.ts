import { NextResponse } from 'next/server';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2024-06-20' });

/** 100% of tip transfers to the connected operator account. */
export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { bookingId, amountCents } = (await req.json()) as { bookingId?: string; amountCents?: number };
  if (!bookingId || !amountCents || amountCents < 100) {
    return NextResponse.json({ error: 'bookingId and amountCents (min 100) required' }, { status: 400 });
  }

  const sb = supabaseServer();
  const { data: resident } = await sb.from('residents').select('id').eq('profile_id', session.user.id).maybeSingle();
  if (!resident) return NextResponse.json({ error: 'no resident' }, { status: 404 });

  const admin = supabaseAdmin();
  const { data: booking } = await admin
    .from('bookings')
    .select('id, operator_id, resident_id')
    .eq('id', bookingId)
    .eq('resident_id', resident.id)
    .maybeSingle();

  if (!booking) return NextResponse.json({ error: 'booking not found' }, { status: 404 });
  const { data: op } = await admin.from('operators').select('stripe_account_id').eq('id', booking.operator_id).maybeSingle();
  const dest = op?.stripe_account_id;
  if (!dest) return NextResponse.json({ error: 'operator not connected' }, { status: 400 });

  const pi = await stripe.paymentIntents.create(
    {
      amount: amountCents,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      application_fee_amount: 0,
      transfer_data: { destination: dest },
      metadata: { booking_id: bookingId, kind: 'tip' },
    },
    { idempotencyKey: `tip:${bookingId}:${amountCents}` }
  );

  await admin.from('bookings').update({ tip_cents: amountCents }).eq('id', bookingId);

  return NextResponse.json({ clientSecret: pi.client_secret, publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY });
}
