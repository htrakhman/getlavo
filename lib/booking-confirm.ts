import type { SupabaseClient } from '@supabase/supabase-js';
import { sendBookingConfirmation, sendBookingNotification } from '@/lib/email/resend';
import { buildIcs } from '@/lib/ics';
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
        resident:residents(spot_label, unit_number, floor_number, vehicle_access_notes, profile:profiles(email, full_name)),
        operator:operators(name, owner_id, profiles:profiles!operators_owner_id_fkey(email, full_name)),
        building:buildings(name, address_line1, address_line2, city, region, postal_code),
        vehicle:vehicles(make, model, color, license_plate),
        package:service_packages(name),
        addon_orders(operator_addon:operator_addons(label))
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

  // Read separately, and tolerate the column being absent: this runs on the
  // paid-booking path, and a deploy that lands ahead of migration 0052 must
  // still send both emails and build the crew roster.
  const { data: notesRow } = await admin
    .from('bookings')
    .select('resident_notes')
    .eq('id', bookingId)
    .maybeSingle();
  const residentNotes = (notesRow as any)?.resident_notes ?? null;

  const location = [building?.address_line1, building?.city, building?.region]
    .filter(Boolean)
    .join(', ');
  const vehicleDesc = vehicle ? `${vehicle.color} ${vehicle.make} ${vehicle.model}` : 'Vehicle';
  const residentRowForIcs = booking.resident as any;
  // The invite has to stand on its own on the operator's calendar — spot and
  // access notes there mean the crew never has to go back to the app.
  const icsDescription = [
    `Car wash at ${building?.name ?? 'your building'}.`,
    vehicle?.license_plate ? `Vehicle: ${vehicleDesc} (${vehicle.license_plate})` : `Vehicle: ${vehicleDesc}`,
    residentRowForIcs?.unit_number ? `Unit: ${residentRowForIcs.unit_number}` : null,
    residentRowForIcs?.spot_label ? `Spot: ${residentRowForIcs.spot_label}` : null,
    'Keys at the front desk before the appointment.',
    residentRowForIcs?.vehicle_access_notes ? `Access: ${residentRowForIcs.vehicle_access_notes}` : null,
    residentNotes ? `Resident notes: ${residentNotes}` : null,
  ]
    .filter(Boolean)
    .join('\n');
  // METHOD:REQUEST makes mail clients render this as a real calendar invite,
  // so the booking lands on both calendars automatically.
  const ics = buildIcs(
    {
      uid: `${bookingId}@getlavo.io`,
      title: `Lavo wash · ${vehicleDesc}`,
      description: icsDescription,
      location,
      date: booking.scheduled_for,
      time: booking.time_slot,
    },
    { method: 'REQUEST' }
  );

  if (resident?.email) {
    await sendBookingConfirmation({
      to: resident.email,
      residentName: resident.full_name,
      operatorName: operator?.name ?? '',
      buildingName: building?.name ?? '',
      scheduledFor: booking.scheduled_for,
      timeSlot: booking.time_slot,
      grossCents: booking.gross_cents,
      bookingId,
      ics,
    }).catch(() => {});
  }

  if (ownerProfile?.email) {
    const { data: fullBooking } = await admin.from('bookings').select('net_cents').eq('id', bookingId).single();
    const residentRow = booking.resident as any;
    await sendBookingNotification({
      to: ownerProfile.email,
      operatorName: ownerProfile.full_name ?? operator.name,
      buildingName: building?.name ?? '',
      residentName: resident?.full_name ?? '',
      vehicleDescription: vehicleDesc,
      scheduledFor: booking.scheduled_for,
      timeSlot: booking.time_slot,
      netCents: fullBooking?.net_cents ?? 0,
      ics,
      // Everything the crew needs to find the car, straight from the inbox.
      address: [building?.address_line1, building?.address_line2, building?.city, building?.region, building?.postal_code]
        .filter(Boolean)
        .join(', ') || null,
      unitNumber: residentRow?.unit_number ?? null,
      spotLabel: residentRow?.spot_label ?? null,
      floorNumber: residentRow?.floor_number ?? null,
      licensePlate: vehicle?.license_plate ?? null,
      accessNotes: residentRow?.vehicle_access_notes ?? null,
      packageName: (booking.package as any)?.name ?? null,
      addonLabels: ((booking.addon_orders as any[]) ?? [])
        .map((a) => a?.operator_addon?.label)
        .filter(Boolean),
      residentNotes,
    }).catch(() => {});
  }
}
