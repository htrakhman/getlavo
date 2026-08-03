import type { SupabaseClient } from '@supabase/supabase-js';
import { sendBookingRescheduled } from '@/lib/email/resend';
import {
  operatorInviteIcs,
  residentInviteIcs,
  residentNextSteps,
  type BookingCalendarDetails,
} from '@/lib/booking-calendar';
import { notify } from '@/lib/notify';
import { notificationCopies } from '@/lib/notification-emails';
import { washDayForBooking } from '@/lib/wash-day-for-booking';

export type RescheduleTarget = {
  /** YYYY-MM-DD */
  scheduledFor: string;
  timeSlot: string | null;
};

type BookingRow = {
  id: string;
  resident_id: string;
  operator_id: string;
  building_id: string | null;
  vehicle_id: string | null;
  wash_day_id: string | null;
  booking_type: string;
  status: string;
  scheduled_for: string;
  time_slot: string | null;
};

/**
 * Move a paid booking to a new date/time. The money is untouched — same
 * booking, same charge, same add-ons — so this only has to keep everything
 * that points at the old date in step:
 *
 *  - the wash_days link (and the crew roster row it hangs off),
 *  - the add-on orders the crew reads off that roster row,
 *  - both calendars, via invites that replace the events already sent.
 *
 * Validation (ownership, status, availability) belongs to the caller; by the
 * time this runs the move is a decision, not a request.
 */
export async function rescheduleBooking(
  admin: SupabaseClient,
  booking: BookingRow,
  target: RescheduleTarget,
  opts: { sequence?: number } = {},
): Promise<{ ok: true } | { ok: false; error: string }> {
  const previous = { scheduledFor: booking.scheduled_for, timeSlot: booking.time_slot };

  const washDayId =
    booking.booking_type === 'building_day'
      ? await washDayForBooking(admin, {
          buildingId: booking.building_id,
          operatorId: booking.operator_id,
          scheduledFor: target.scheduledFor,
        })
      : null;

  const { error: updateError } = await admin
    .from('bookings')
    .update({
      scheduled_for: target.scheduledFor,
      time_slot: target.timeSlot,
      wash_day_id: washDayId,
    })
    .eq('id', booking.id);
  if (updateError) return { ok: false, error: updateError.message };

  if (washDayId !== booking.wash_day_id) {
    await moveRosterRow(admin, booking, washDayId);
  }

  await notifyRescheduled(admin, booking.id, previous, opts.sequence ?? 1);
  return { ok: true };
}

/**
 * Take the resident off the old day's roster and put them on the new one, then
 * point this booking's add-ons at the new wash so the crew still sees the
 * extras they were paid for.
 *
 * Order matters: addon_orders cascade off washes, so the add-ons have to be
 * moved to the new wash before the old roster row goes — deleting first would
 * take the resident's paid extras with it.
 *
 * Only an untouched roster row is removed — a wash already under way stays
 * where it is — and a resident whose package independently puts them on the
 * building's roster keeps their standing spot, the same rule cancellation uses.
 */
async function moveRosterRow(admin: SupabaseClient, booking: BookingRow, washDayId: string | null) {
  const { data: resident } = await admin
    .from('residents')
    .select('package_id, spot_label')
    .eq('id', booking.resident_id)
    .maybeSingle();

  // Only a paid booking earns a place on the roster — an unpaid one gets there
  // when its payment confirms (see lib/booking-confirm.ts).
  const rostered = ['confirmed', 'in_progress'].includes(booking.status);
  let washId: string | null = null;
  if (washDayId && rostered && booking.vehicle_id) {
    const { error } = await admin.from('washes').upsert(
      {
        wash_day_id: washDayId,
        resident_id: booking.resident_id,
        vehicle_id: booking.vehicle_id,
        spot_label: resident?.spot_label ?? null,
      },
      { onConflict: 'wash_day_id,resident_id', ignoreDuplicates: true },
    );
    if (error) {
      console.error('[booking-reschedule] failed to add the new roster row', {
        bookingId: booking.id,
        washDayId,
        message: error.message,
      });
    }
    // An ignoreDuplicates upsert returns nothing when the row already existed,
    // so read the wash back rather than relying on the insert result.
    const { data: washRow } = await admin
      .from('washes')
      .select('id')
      .eq('wash_day_id', washDayId)
      .eq('resident_id', booking.resident_id)
      .maybeSingle();
    washId = washRow?.id ?? null;
  }

  const { error: addonError } = await admin
    .from('addon_orders')
    .update({ wash_id: washId })
    .eq('booking_id', booking.id);
  if (addonError) {
    console.error('[booking-reschedule] failed to repoint add-ons at the new wash', {
      bookingId: booking.id,
      washId,
      message: addonError.message,
    });
  }

  if (booking.wash_day_id && !resident?.package_id) {
    const { error } = await admin
      .from('washes')
      .delete()
      .eq('wash_day_id', booking.wash_day_id)
      .eq('resident_id', booking.resident_id)
      .eq('status', 'scheduled');
    if (error) {
      console.error('[booking-reschedule] failed to clear the old roster row', {
        bookingId: booking.id,
        washDayId: booking.wash_day_id,
        message: error.message,
      });
    }
  }
}

/** Updated invites and inbox rows for both sides of a moved booking. */
async function notifyRescheduled(
  admin: SupabaseClient,
  bookingId: string,
  previous: { scheduledFor: string; timeSlot: string | null },
  sequence: number,
) {
  const { data: booking } = await admin
    .from('bookings')
    .select(`
        id, scheduled_for, time_slot, wash_day_id, resident_id, vehicle_id,
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

  const { data: addonRows } = await admin
    .from('addon_orders')
    .select('operator_addon:operator_addons(label)')
    .eq('booking_id', bookingId);
  const addonLabels = (addonRows ?? [])
    .map((r: any) => r.operator_addon?.label)
    .filter(Boolean) as string[];

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
    addonLabels,
    sequence,
  };

  const common = {
    buildingName: building?.name ?? '',
    previousScheduledFor: previous.scheduledFor,
    previousTimeSlot: previous.timeSlot,
    scheduledFor: booking.scheduled_for,
    timeSlot: booking.time_slot,
  };

  if (resident?.email) {
    await sendBookingRescheduled({
      ...common,
      to: resident.email,
      // "Schedule changes always send" on the account page covers the extras
      // too — a partner who shares the car has to know the wash moved.
      copies: notificationCopies(resident),
      recipientName: resident.full_name ?? 'there',
      audience: 'resident',
      counterpartyName: operator?.name ?? null,
      vehicleDescription: vehicleDesc,
      nextSteps: residentNextSteps(details),
      ics: residentInviteIcs(details, { email: resident.email, name: resident.full_name }),
    }).catch((e) =>
      console.error('[booking-reschedule] resident email failed', { bookingId, message: e?.message }),
    );
  }

  if (ownerProfile?.email) {
    await sendBookingRescheduled({
      ...common,
      to: ownerProfile.email,
      recipientName: ownerProfile.full_name ?? operator?.name ?? 'there',
      audience: 'operator',
      counterpartyName: resident?.full_name ?? null,
      vehicleDescription: vehicleDesc,
      ics: operatorInviteIcs(details, {
        email: ownerProfile.email,
        name: ownerProfile.full_name ?? operator?.name,
      }),
    }).catch((e) =>
      console.error('[booking-reschedule] operator email failed', { bookingId, message: e?.message }),
    );
  }

  // Inbox rows only: the emails above already carry the updated invites, and
  // notify() would send a second, plainer copy of the same news.
  const residentProfileId = (booking.resident as any)?.profile_id;
  if (residentProfileId) {
    await notify(
      residentProfileId,
      'booking_rescheduled',
      { ...common, link: `/resident/bookings?booking=${bookingId}` },
      { skipEmail: true },
    ).catch(() => {});
  }
  if (operator?.owner_id) {
    await notify(
      operator.owner_id,
      'booking_rescheduled',
      {
        ...common,
        residentName: resident?.full_name ?? '',
        link: '/operator/bookings',
      },
      { skipEmail: true },
    ).catch(() => {});
  }
}
