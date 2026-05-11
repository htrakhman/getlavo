import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { audit } from '@/lib/audit';

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const sb = supabaseServer();
  const { data: profile } = await sb.from('profiles').select('role').eq('id', session.user.id).maybeSingle();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: 'stripe not configured' }, { status: 503 });
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

  const { bookingId } = await req.json();
  if (!bookingId) return NextResponse.json({ error: 'missing bookingId' }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: booking } = await admin.from('bookings').select('id, stripe_payment_intent_id, gross_cents').eq('id', bookingId).maybeSingle();
  if (!booking) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (!booking.stripe_payment_intent_id) return NextResponse.json({ error: 'no payment to refund' }, { status: 400 });

  try {
    const refund = await stripe.refunds.create({
      payment_intent: booking.stripe_payment_intent_id,
      reverse_transfer: true,
      refund_application_fee: true,
    });
    await admin.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId);
    await audit({
      actorId: session.user.id,
      actorRole: 'admin',
      action: 'admin.refund',
      entityType: 'booking',
      entityId: bookingId,
      metadata: { refundId: refund.id, amount: booking.gross_cents },
    });
    return NextResponse.json({ refundId: refund.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
