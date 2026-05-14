import { NextResponse } from 'next/server';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

function icsEscape(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = supabaseServer();
  const { data: resident } = await sb.from('residents').select('id').eq('profile_id', session.user.id).maybeSingle();
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
    admin.from('buildings').select('name').eq('id', booking.building_id).maybeSingle(),
    admin.from('vehicles').select('make, model, color').eq('id', booking.vehicle_id).maybeSingle(),
  ]);
  const vehicleDesc = veh ? `${veh.color} ${veh.make} ${veh.model}` : 'Vehicle';
  const date = booking.scheduled_for as string;
  const slot = (booking.time_slot as string) || 'Morning';
  const uid = `${booking.id}@getlavo.io`;
  const dt = `${date.replace(/-/g, '')}T130000Z`;
  const opName = op?.name ?? 'Lavo operator';
  const bname = bld?.name ?? 'Your building';
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Lavo//Booking//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dt}`,
    `DTSTART;VALUE=DATE:${date.replace(/-/g, '')}`,
    `SUMMARY:${icsEscape(`Lavo wash · ${vehicleDesc}`)}`,
    `DESCRIPTION:${icsEscape(`${opName} at ${bname}. Window: ${slot}`)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return new NextResponse(lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="lavo-booking-${booking.id}.ics"`,
    },
  });
}
