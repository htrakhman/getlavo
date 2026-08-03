import type { SupabaseClient } from '@supabase/supabase-js';
import { sendBookingCancelled } from '@/lib/email/resend';
import {
  operatorCancelIcs,
  residentCancelIcs,
  type BookingCalendarDetails,
} from '@/lib/booking-calendar';
import { notify } from '@/lib/notify';
import { notificationCopies } from '@/lib/notification-emails';
import type { RefundOutcome } from '@/lib/cancellation-policy';

/**
 * Tell both sides a wash was called off.
 *
 * Cancelling used to update the row and return — no email, no inbox row, no
 * calendar update. The operator's only signal was the car never appearing, and
 * both calendars kept an appointment nobody was coming to. This mirrors
 * notifyRescheduled: a real email each way carrying a METHOD:CANCEL invite that
 * takes the event back off the calendar, plus a link into Lavo.
 */
export async function notifyCancelled(
  admin: SupabaseClient,
  bookingId: string,
  opts: { refund?: RefundOutcome } = {},
) {
  const { data: booking } = await admin
    .from('bookings')
    .select(`
        id, scheduled_for, time_slot, resident_id, vehicle_id,
        resident:residents(spot_label, profile_id, vehicle_access_notes, profile:profiles(email, full_name, notification_emails)),
        operator:operators(name, owner_id, profiles:profiles!operators_owner_id_fkey(email, full_name)),
        building:buildings(name, address_line1, city, region),
        vehicle:vehicles(make, model, color)
      `)
    .eq('id', bookingId)
    .maybeSingle();
  if (!booking) return;

  const resident = (booking.resident as any)?.profile;
  const operator = booking.operator as any;
  const building = booking.building as any;
  const vehicle = booking.vehicle as any;
  const ownerProfile = operator?.profiles;

  const location = [building?.address_line1, building?.city, building?.region].filter(Boolean).join(', ');
  const vehicleDesc = vehicle ? `${vehicle.color} ${vehicle.make} ${vehicle.model}` : 'Vehicle';

  const details: BookingCalendarDetails = {
    bookingId,
    scheduledFor: booking.scheduled_for,
    timeSlot: booking.time_slot,
    buildingName: building?.name ?? null,
    operatorName: operator?.name ?? null,
    residentName: resident?.full_name ?? null,
    vehicleDesc,
    location,
    spotLabel: (booking.resident as any)?.spot_label ?? null,
    accessNotes: (booking.resident as any)?.vehicle_access_notes ?? null,
  };

  const common = {
    buildingName: building?.name ?? '',
    scheduledFor: booking.scheduled_for,
    timeSlot: booking.time_slot,
    vehicleDescription: vehicleDesc,
  };

  if (resident?.email) {
    await sendBookingCancelled({
      ...common,
      to: resident.email,
      copies: notificationCopies(resident),
      recipientName: resident.full_name ?? 'there',
      audience: 'resident',
      counterpartyName: operator?.name ?? null,
      refund: opts.refund,
      ics: residentCancelIcs(details, { email: resident.email, name: resident.full_name }),
    }).catch((e) =>
      console.error('[booking-cancel] resident email failed', { bookingId, message: e?.message }),
    );
  }

  if (ownerProfile?.email) {
    await sendBookingCancelled({
      ...common,
      to: ownerProfile.email,
      recipientName: ownerProfile.full_name ?? operator?.name ?? 'there',
      audience: 'operator',
      counterpartyName: resident?.full_name ?? null,
      ics: operatorCancelIcs(details, {
        email: ownerProfile.email,
        name: ownerProfile.full_name ?? operator?.name,
      }),
    }).catch((e) =>
      console.error('[booking-cancel] operator email failed', { bookingId, message: e?.message }),
    );
  }

  // Inbox rows only: the emails above already carry the cancelled invites, and
  // notify() would send a second, plainer copy of the same news.
  const residentProfileId = (booking.resident as any)?.profile_id;
  if (residentProfileId) {
    await notify(
      residentProfileId,
      'booking_cancelled',
      {
        buildingName: building?.name ?? '',
        scheduledFor: booking.scheduled_for,
        timeSlot: booking.time_slot,
        refund: opts.refund,
        link: '/resident/bookings',
      },
      { skipEmail: true },
    ).catch(() => {});
  }
  if (operator?.owner_id) {
    await notify(
      operator.owner_id,
      'booking_cancelled',
      {
        buildingName: building?.name ?? '',
        residentName: resident?.full_name ?? '',
        scheduledFor: booking.scheduled_for,
        timeSlot: booking.time_slot,
        link: '/operator/bookings',
      },
      { skipEmail: true },
    ).catch(() => {});
  }
}
