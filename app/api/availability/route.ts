import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getBuildingAvailability } from '@/lib/availability';

export const dynamic = 'force-dynamic';

/**
 * Availability for the signed-in resident's building, optionally scoped to a
 * specific operator (?operatorId=). Used by the booking form so its date and
 * time pickers stay in sync with operator hours and agreed wash days.
 *
 * `?rescheduleBookingId=` is for moving an existing booking: that booking's own
 * seat is left out of the capacity count, so the resident sitting on a full day
 * can still see it as open to themselves. Only the resident's own bookings
 * qualify — anyone else's id is ignored rather than used to free up a seat.
 */
export async function GET(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = supabaseAdmin();
  const { data: resident } = await admin
    .from('residents')
    .select('id, building_id')
    .eq('profile_id', session.user.id)
    .maybeSingle();
  if (!resident) return NextResponse.json({ error: 'No resident record' }, { status: 404 });

  const operatorId = req.nextUrl.searchParams.get('operatorId') ?? undefined;
  const rescheduleBookingId = req.nextUrl.searchParams.get('rescheduleBookingId');

  let excludeBookingId: string | undefined;
  if (rescheduleBookingId) {
    const { data: own } = await admin
      .from('bookings')
      .select('id')
      .eq('id', rescheduleBookingId)
      .eq('resident_id', resident.id)
      .maybeSingle();
    excludeBookingId = own?.id;
  }

  const days = await getBuildingAvailability(resident.building_id, operatorId, { excludeBookingId });
  return NextResponse.json({ days });
}
