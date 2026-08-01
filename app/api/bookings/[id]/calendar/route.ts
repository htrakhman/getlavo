import { NextResponse } from 'next/server';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { residentInviteIcs, type BookingCalendarDetails } from '@/lib/booking-calendar';

/**
 * Downloadable calendar file for one of the resident's own bookings — the
 * second delivery path for the invite, for when the emailed attachment was
 * missed or the resident is adding it from another device.
 *
 * This builds the same event as the confirmation email (lib/booking-calendar)
 * rather than hand-rolling its own VCALENDAR, which is how this route drifted
 * into emitting an all-day event for a booking that had a time slot.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = supabaseServer();
  const { data: resident } = await sb
    .from('residents')
    .select('id, spot_label, vehicle_access_notes')
    .eq('profile_id', session.user.id)
    .maybeSingle();
  if (!resident) return NextResponse.json({ error: 'no resident' }, { status: 404 });

  const admin = supabaseAdmin();
  const { data: booking } = await admin
    .from('bookings')
    .select('id, scheduled_for, time_slot, status, operator_id, building_id, vehicle_id')
    .eq('id', params.id)
    .eq('resident_id', resident.id)
    .maybeSingle();

  if (!booking) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const [{ data: op }, { data: bld }, { data: veh }] = await Promise.all([
    admin.from('operators').select('name').eq('id', booking.operator_id).maybeSingle(),
    admin
      .from('buildings')
      .select('name, address_line1, city, region')
      .eq('id', booking.building_id)
      .maybeSingle(),
    admin.from('vehicles').select('make, model, color').eq('id', booking.vehicle_id).maybeSingle(),
  ]);

  const details: BookingCalendarDetails = {
    bookingId: booking.id,
    scheduledFor: booking.scheduled_for as string,
    timeSlot: booking.time_slot as string | null,
    buildingName: bld?.name ?? null,
    operatorName: op?.name ?? null,
    residentName: session.profile.full_name ?? null,
    vehicleDesc: veh ? `${veh.color} ${veh.make} ${veh.model}` : 'Vehicle',
    location: [bld?.address_line1, bld?.city, bld?.region].filter(Boolean).join(', '),
    spotLabel: resident.spot_label ?? null,
    accessNotes: resident.vehicle_access_notes ?? null,
  };

  // PUBLISH, not REQUEST: the resident asked for this file themselves, so it is
  // an event to add rather than an invitation to accept.
  const ics = residentInviteIcs(details);

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="lavo-booking-${booking.id}.ics"`,
    },
  });
}
