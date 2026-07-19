import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getBuildingAvailability } from '@/lib/availability';

export const dynamic = 'force-dynamic';

/**
 * Availability for the signed-in resident's building, optionally scoped to a
 * specific operator (?operatorId=). Used by the booking form so its date and
 * time pickers stay in sync with operator hours and agreed wash days.
 */
export async function GET(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: resident } = await supabaseAdmin()
    .from('residents')
    .select('building_id')
    .eq('profile_id', session.user.id)
    .maybeSingle();
  if (!resident) return NextResponse.json({ error: 'No resident record' }, { status: 404 });

  const operatorId = req.nextUrl.searchParams.get('operatorId') ?? undefined;
  const days = await getBuildingAvailability(resident.building_id, operatorId);
  return NextResponse.json({ days });
}
