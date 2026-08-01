import type { SupabaseClient } from '@supabase/supabase-js';
import { sendBookingConfirmation, sendBookingNotification } from '@/lib/email/resend';
import {
  operatorInviteIcs,
  residentInviteIcs,
  residentNextSteps,
  type BookingCalendarDetails,
} from '@/lib/booking-calendar';
import { notify } from '@/lib/notify';
import { settleBookingAddonOrders } from '@/lib/addons';

/**
 * After payment (or a fully discounted checkout), mark paid and notify resident + operator.
 */
export async function confirmPaidBookingAndNotify(
  admin: SupabaseClient,
  bookingId: string,
  stripePaymentIntentId?: string | null,
) {
  const { data: existing } = await admin
    .from('bookings')
    .select('id, status, paid_at')
    .eq('id', bookingId)
    .maybeSingle();
  if (existing?.paid_at && existing.status === 'confirmed') {
    return;
  }

  await admin
    .from('bookings')
    .update({
      status: 'confirmed',
      paid_at: new Date().toISOString(),
      ...(stripePaymentIntentId
        ? { stripe_payment_intent_id: stripePaymentIntentId }
        : {}),
    })
    .eq('id', bookingId);

  const { data: booking } = await admin
    .from('bookings')
    .select(`
        id, scheduled_for, time_slot, gross_cents, wash_day_id, resident_id, vehicle_id,
        resident:residents(spot_label, profile_id, vehicle_access_notes, profile:profiles(email, full_name)),
        operator:operators(name, owner_id, profiles:profiles!operators_owner_id_fkey(email, full_name)),
        building:buildings(name, address_line1, city, region),
        vehicle:vehicles(make, model, color)
      `)
    .eq('id', bookingId)
    .single();

  if (!booking) return;

  // A paid building-day booking puts the resident on the operator's crew
  // roster for that wash day — this is what makes them visible on the
  // prep list and crew tool. Idempotent per (wash_day, resident).
  let washId: string | null = null;
  if (booking.wash_day_id && booking.resident_id && booking.vehicle_id) {
    const { error: rosterError } = await admin.from('washes').upsert(
      {
        wash_day_id: booking.wash_day_id,
        resident_id: booking.resident_id,
        vehicle_id: booking.vehicle_id,
        spot_label: (booking.resident as any)?.spot_label ?? null,
      },
      { onConflict: 'wash_day_id,resident_id', ignoreDuplicates: true }
    );
    if (rosterError) {
      console.error('[booking-confirm] failed to add booking to wash-day roster', {
        bookingId,
        washDayId: booking.wash_day_id,
        message: rosterError.message,
      });
    }

    // An ignoreDuplicates upsert returns nothing when the roster row already
    // existed, so read the wash back rather than relying on the insert result.
    const { data: washRow } = await admin
      .from('washes')
      .select('id')
      .eq('wash_day_id', booking.wash_day_id)
      .eq('resident_id', booking.resident_id)
      .maybeSingle();
    washId = washRow?.id ?? null;
  }

  // Paid add-ons become the crew's instructions: the crew tool reads them off
  // the wash, so point them at the roster row now that it exists.
  await settleBookingAddonOrders(admin, { bookingId, washId, paymentIntentId: stripePaymentIntentId });

  const resident = (booking.resident as any)?.profile;
  const operator = booking.operator as any;
  const building = booking.building as any;
  const vehicle = booking.vehicle as any;
  const ownerProfile = operator?.profiles;

  const location = [building?.address_line1, building?.city, building?.region]
    .filter(Boolean)
    .join(', ');
  const vehicleDesc = vehicle ? `${vehicle.color} ${vehicle.make} ${vehicle.model}` : 'Vehicle';

  // The paid extras belong on the operator's invite — it is the brief they read
  // at the car, and the crew tool is not open on their phone in the garage.
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
  };

  const bookingLink = `/resident/bookings?booking=${bookingId}`;

  if (resident?.email) {
    // Addressing the invite to the recipient is what makes a METHOD:REQUEST
    // render as an actionable invite rather than a bare attachment.
    const ics = residentInviteIcs(details, {
      email: resident.email,
      name: resident.full_name,
    });
    await sendBookingConfirmation({
      to: resident.email,
      residentName: resident.full_name,
      operatorName: operator?.name ?? '',
      buildingName: building?.name ?? '',
      scheduledFor: booking.scheduled_for,
      timeSlot: booking.time_slot,
      grossCents: booking.gross_cents,
      bookingId,
      nextSteps: residentNextSteps(details),
      ics,
    }).catch((e) =>
      // Swallowing this silently meant a paid, transferred booking could reach
      // nobody and leave no trace of why.
      console.error('[booking-confirm] resident confirmation email failed', {
        bookingId,
        message: e?.message,
      }),
    );
  }

  if (ownerProfile?.email) {
    const { data: fullBooking } = await admin.from('bookings').select('net_cents').eq('id', bookingId).single();
    const ics = operatorInviteIcs(details, {
      email: ownerProfile.email,
      name: ownerProfile.full_name ?? operator?.name,
    });
    await sendBookingNotification({
      to: ownerProfile.email,
      operatorName: ownerProfile.full_name ?? operator.name,
      buildingName: building?.name ?? '',
      residentName: resident?.full_name ?? '',
      vehicleDescription: vehicleDesc,
      spotLabel: details.spotLabel,
      addonLabels,
      scheduledFor: booking.scheduled_for,
      timeSlot: booking.time_slot,
      netCents: fullBooking?.net_cents ?? 0,
      ics,
    }).catch((e) =>
      console.error('[booking-confirm] operator notification email failed', {
        bookingId,
        message: e?.message,
      }),
    );
  }

  // In-app inbox rows for both sides. The rich confirmation emails above already
  // carry the invites, so these are notification-row-only — notify() would
  // otherwise send a second, plainer email for the same booking.
  const residentProfileId = (booking.resident as any)?.profile_id;
  if (residentProfileId) {
    await notify(
      residentProfileId,
      'booking_confirmed',
      {
        buildingName: building?.name ?? '',
        scheduledFor: booking.scheduled_for,
        timeSlot: booking.time_slot,
        link: bookingLink,
      },
      { skipEmail: true },
    ).catch(() => {});
  }
  if (operator?.owner_id) {
    await notify(
      operator.owner_id,
      'booking_received',
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
