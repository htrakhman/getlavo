import { NextResponse } from 'next/server';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { refundBookingPayment } from '@/lib/stripe/refund-booking';
import { audit } from '@/lib/audit';

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const sb = supabaseServer();
  const { data: profile } = await sb.from('profiles').select('role').eq('id', session.user.id).maybeSingle();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: 'stripe not configured' }, { status: 503 });

  const { bookingId } = await req.json();
  if (!bookingId) return NextResponse.json({ error: 'missing bookingId' }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: booking } = await admin.from('bookings').select('id, stripe_payment_intent_id, gross_cents').eq('id', bookingId).maybeSingle();
  if (!booking) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (!booking.stripe_payment_intent_id) return NextResponse.json({ error: 'no payment to refund' }, { status: 400 });

  // An admin override is not bound by the resident's 24-hour window — that is
  // the point of having one. It reverses the operator transfer and the platform
  // fee the same way a self-serve refund does (lib/stripe/refund-booking.ts).
  const result = await refundBookingPayment(admin, {
    bookingId,
    paymentIntentId: booking.stripe_payment_intent_id,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  await admin.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId);
  await audit({
    actorId: session.user.id,
    actorRole: 'admin',
    action: 'admin.refund',
    entityType: 'booking',
    entityId: bookingId,
    metadata: {
      refundId: result.refundId,
      amount: booking.gross_cents,
      outcome: result.outcome,
    },
  });
  return NextResponse.json({ refundId: result.refundId, outcome: result.outcome });
}
