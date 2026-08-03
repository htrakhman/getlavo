import { NextResponse } from 'next/server';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { notifyCancelled } from '@/lib/booking-cancel';
import { notifyRefunded } from '@/lib/refund';
import { refundBookingPayment } from '@/lib/stripe/refund-booking';
import { CANCELLATION_CUTOFF_HOURS, refundEligibility } from '@/lib/cancellation-policy';
import { formatInZone } from '@/lib/wash-time';
import { audit } from '@/lib/audit';

/**
 * A resident calling off one of their own washes.
 *
 * Cancelling is always allowed — the operator has to know the car isn't coming,
 * and the hour goes back on the calendar either way. The refund is what the
 * 24-hour window governs (see lib/cancellation-policy.ts): outside it the
 * payment comes back in full, inside it the booking is cancelled without a
 * refund, and the resident has to say so explicitly first.
 *
 * That acknowledgment is the point of `acknowledgeNoRefund`. The portal already
 * shows which side of the window a booking is on, but a tab left open across
 * the deadline would show the refundable wording while the server sees an
 * unrefundable booking. Rather than quietly taking the money, that case comes
 * back as a 409 the portal re-renders as the no-refund prompt — nobody forfeits
 * a payment by pressing a button that promised otherwise.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // A bare POST (no body) is still valid: it means "cancel, refund if due".
  let body: { acknowledgeNoRefund?: boolean } = {};
  try {
    const raw = await req.json();
    if (raw && typeof raw === 'object') body = raw as typeof body;
  } catch {
    /* no body */
  }

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
    .select(
      'id, status, stripe_payment_intent_id, gross_cents, scheduled_for, time_slot, resident_id, wash_day_id',
    )
    .eq('id', params.id)
    .eq('resident_id', resident.id)
    .maybeSingle();

  if (!booking) return NextResponse.json({ error: 'booking not found' }, { status: 404 });

  const cancellable = ['confirmed', 'pending_payment'];
  if (!cancellable.includes(booking.status)) {
    return NextResponse.json({ error: `Cannot cancel a booking with status '${booking.status}'` }, { status: 400 });
  }

  const eligibility = refundEligibility(booking.scheduled_for, booking.time_slot);
  // Money is only at stake on a booking that actually paid. One still sitting on
  // `pending_payment` never completed checkout, so the window has nothing to
  // govern, nothing to acknowledge and nothing to send back.
  const paidFor = booking.status === 'confirmed' && Boolean(booking.stripe_payment_intent_id);

  if (paidFor && !eligibility.refundable && !body.acknowledgeNoRefund) {
    return NextResponse.json(
      {
        error:
          `Your wash starts in under ${CANCELLATION_CUTOFF_HOURS} hours, so this booking can no longer be refunded. ` +
          'You can still cancel it — confirm and we’ll let your operator know.',
        refundable: false,
        requiresAcknowledgement: true,
        ...(eligibility.deadline ? { deadlinePassed: formatInZone(eligibility.deadline) } : {}),
      },
      { status: 409 },
    );
  }

  // Refund before cancelling: a booking marked cancelled with the money still
  // taken is the state nobody can see is wrong from the outside.
  let refunded = false;
  let refundId: string | null = null;
  // What Stripe actually sent back, which is what the resident's refund email
  // quotes. Read off the refund rather than the booking's gross so the email
  // can never promise more than the money that moved.
  let refundedCents: number | null = null;
  if (paidFor && eligibility.refundable) {
    const result = await refundBookingPayment(admin, {
      bookingId: booking.id,
      paymentIntentId: booking.stripe_payment_intent_id!,
    });
    if (!result.ok) {
      return NextResponse.json({ error: `Refund failed: ${result.error}` }, { status: 500 });
    }
    // "Nothing captured" is a booking that never completed checkout: there is
    // no money to send back, so the resident isn't told one is coming.
    refunded = result.outcome !== 'nothing_captured';
    refundId = result.refundId;
    refundedCents = result.amountCents;
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

  // Why this booking was or wasn't refunded, on the record. A resident asking
  // later where their money went is answered from here rather than from memory.
  await audit({
    actorId: session.user.id,
    actorRole: 'resident',
    action: 'booking.cancel',
    entityType: 'booking',
    entityId: booking.id,
    metadata: {
      refunded,
      refundId,
      grossCents: booking.gross_cents,
      scheduledFor: booking.scheduled_for,
      timeSlot: booking.time_slot,
      hoursBeforeStart:
        eligibility.hoursUntilStart == null ? null : Math.round(eligibility.hoursUntilStart * 10) / 10,
      cutoffHours: CANCELLATION_CUTOFF_HOURS,
      hadPayment: paidFor,
    },
  });

  // After the roster cleanup, so the operator's email reflects a booking that is
  // already off their list. Never fails the cancellation: the money is refunded
  // and the row is updated either way.
  await notifyCancelled(admin, booking.id, {
    refunded,
    refundWithheld: paidFor && !refunded,
  }).catch((e) =>
    console.error('[bookings/cancel] notification failed', { bookingId: booking.id, message: e?.message }),
  );

  // Separate from the cancellation notice on purpose: that one settles the
  // appointment, this one settles the money and carries the 5–10 business day
  // wait, which is the thing a resident watching their statement needs.
  if (refunded) {
    await notifyRefunded(admin, booking.id, refundedCents ?? booking.gross_cents ?? 0).catch((e) =>
      console.error('[bookings/cancel] refund notification failed', { bookingId: booking.id, message: e?.message }),
    );
  }

  return NextResponse.json({ ok: true, refunded });
}
