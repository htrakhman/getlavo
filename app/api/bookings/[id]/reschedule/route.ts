import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getBuildingAvailability } from '@/lib/availability';
import { rescheduleBooking } from '@/lib/booking-reschedule';
import { CANCELLATION_CUTOFF_HOURS, refundEligibility } from '@/lib/cancellation-policy';
import { audit } from '@/lib/audit';
import { z } from 'zod';

const Body = z.object({
  scheduledFor: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeSlot: z.string().max(20).optional(),
});

/**
 * Move one of the resident's own bookings to another open slot. The price is
 * settled, so nothing is charged or refunded here — the booking keeps its
 * payment, its add-ons and its place in the operator's day, and only the date
 * and time change.
 *
 * A booking can only land somewhere the operator is actually open: the target
 * is checked against the same availability the booking form offers, minus this
 * booking's own seat, so a full day can still be reshuffled by the person
 * already on it.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const body = Body.safeParse(raw);
  if (!body.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const { scheduledFor } = body.data;
  const timeSlot = body.data.timeSlot?.trim() || null;

  // Admin client throughout, scoped to this user's own resident row — the same
  // reason the bookings page uses it (see migration 0033).
  const admin = supabaseAdmin();

  const { data: resident } = await admin
    .from('residents')
    .select('id')
    .eq('profile_id', session.user.id)
    .maybeSingle();
  if (!resident) return NextResponse.json({ error: 'not a resident' }, { status: 403 });

  const { data: booking } = await admin
    .from('bookings')
    .select(
      'id, resident_id, operator_id, building_id, vehicle_id, wash_day_id, booking_type, status, scheduled_for, time_slot',
    )
    .eq('id', params.id)
    .eq('resident_id', resident.id)
    .maybeSingle();
  if (!booking) return NextResponse.json({ error: 'booking not found' }, { status: 404 });

  const reschedulable = ['confirmed', 'pending_payment'];
  if (!reschedulable.includes(booking.status)) {
    return NextResponse.json(
      { error: `Cannot reschedule a booking with status '${booking.status}'` },
      { status: 400 },
    );
  }

  if (scheduledFor === booking.scheduled_for && timeSlot === booking.time_slot) {
    return NextResponse.json({ error: 'That is already when your wash is booked.' }, { status: 400 });
  }

  // Moving a wash follows the same 24-hour window as cancelling it — the crew's
  // day is built around the slots they're holding, and /help has said as much
  // since long before anything enforced it. Inside the window the booking keeps
  // its time; the resident can still cancel, they just can't be refunded.
  const moveWindow = refundEligibility(booking.scheduled_for, booking.time_slot);
  if (!moveWindow.refundable) {
    return NextResponse.json(
      {
        error:
          `Washes can be moved up to ${CANCELLATION_CUTOFF_HOURS} hours before they start, and yours is inside that window. ` +
          'Reach out to your operator if you need to change it.',
      },
      { status: 409 },
    );
  }

  if (!booking.building_id) {
    return NextResponse.json({ error: 'This booking has no building to reschedule against.' }, { status: 400 });
  }

  const days = await getBuildingAvailability(booking.building_id, booking.operator_id, {
    excludeBookingId: booking.id,
  });
  const day = days.find((d) => d.date === scheduledFor);
  if (!day || day.slots.length === 0) {
    return NextResponse.json(
      {
        error: day?.full
          ? 'That day is fully booked. Please pick another.'
          : 'Your operator isn’t washing on that day. Please pick another.',
      },
      { status: 409 },
    );
  }
  if (timeSlot && !day.slots.includes(timeSlot)) {
    return NextResponse.json({ error: 'That time is no longer open. Please pick another.' }, { status: 409 });
  }

  // Every move on this booking bumps the calendar revision, so the new invite
  // replaces the last one instead of stacking up beside it.
  const { count: moves } = await admin
    .from('audit_logs')
    .select('id', { count: 'exact', head: true })
    .eq('entity_type', 'booking')
    .eq('entity_id', booking.id)
    .eq('action', 'booking.reschedule');

  const result = await rescheduleBooking(
    admin,
    booking,
    { scheduledFor, timeSlot },
    { sequence: (moves ?? 0) + 1 },
  );
  if (!result.ok) {
    console.error('[bookings/reschedule] failed', { bookingId: booking.id, message: result.error });
    return NextResponse.json({ error: 'Could not move your booking. Please try again.' }, { status: 500 });
  }

  await audit({
    actorId: session.user.id,
    actorRole: 'resident',
    action: 'booking.reschedule',
    entityType: 'booking',
    entityId: booking.id,
    metadata: {
      from: { scheduledFor: booking.scheduled_for, timeSlot: booking.time_slot },
      to: { scheduledFor, timeSlot },
    },
  });

  return NextResponse.json({ ok: true, scheduledFor, timeSlot });
}
