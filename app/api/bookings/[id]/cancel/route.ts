import { NextResponse } from 'next/server';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { notifyCancelled } from '@/lib/booking-cancel';
import { cancellationWindow, type RefundOutcome } from '@/lib/cancellation-policy';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = supabaseServer();
  const admin = supabaseAdmin();

  // Verify the booking belongs to this resident
  const { data: resident } = await sb
    .from('residents')
    .select('id')
    .eq('profile_id', session.user.id)
    .maybeSingle();
  if (!resident) return NextResponse.json({ error: 'not a resident' }, { status: 403 });

  const { data: booking } = await admin
    .from('bookings')
    .select('id, status, stripe_payment_intent_id, gross_cents, scheduled_for, time_slot, resident_id, wash_day_id')
    .eq('id', params.id)
    .eq('resident_id', resident.id)
    .maybeSingle();

  if (!booking) return NextResponse.json({ error: 'booking not found' }, { status: 404 });

  const cancellable = ['confirmed', 'pending_payment'];
  if (!cancellable.includes(booking.status)) {
    return NextResponse.json({ error: `Cannot cancel a booking with status '${booking.status}'` }, { status: 400 });
  }

  // Cancelling is always allowed; the refund is what the 24-hour window decides.
  // A wash this close has the crew's slot already committed, so the charge stands
  // — but the cancellation still runs, so nobody drives out to an empty spot.
  const { refundable } = cancellationWindow(booking.scheduled_for, booking.time_slot);

  // Issue Stripe refund if there was a payment to give back
  let refund: RefundOutcome | undefined;
  if (booking.stripe_payment_intent_id && process.env.STRIPE_SECRET_KEY) {
    if (!refundable) {
      refund = 'withheld_late';
    } else {
      try {
        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
        await stripe.refunds.create({
          payment_intent: booking.stripe_payment_intent_id,
          reason: 'requested_by_customer',
        });
        refund = 'issued';
      } catch (e: any) {
        return NextResponse.json({ error: `Refund failed: ${e.message}` }, { status: 500 });
      }
    }
  }

  const { error } = await admin
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', booking.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // The booking put this resident on the wash-day roster; take them off
  // again unless a service package independently keeps them there. Only
  // untouched roster rows are removed — a wash that already started stays.
  if (booking.wash_day_id) {
    const { data: res } = await admin
      .from('residents')
      .select('package_id')
      .eq('id', resident.id)
      .maybeSingle();
    if (!res?.package_id) {
      await admin
        .from('washes')
        .delete()
        .eq('wash_day_id', booking.wash_day_id)
        .eq('resident_id', resident.id)
        .eq('status', 'scheduled');
    }
  }

  // After the roster cleanup, so the operator's email reflects a booking that is
  // already off their list. Never fails the cancellation: the money is refunded
  // and the row is updated either way.
  await notifyCancelled(admin, booking.id, { refund }).catch((e) =>
    console.error('[bookings/cancel] notification failed', { bookingId: booking.id, message: e?.message }),
  );

  return NextResponse.json({ ok: true, refunded: refund === 'issued', refund: refund ?? null });
}
