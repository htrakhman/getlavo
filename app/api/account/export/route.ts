import { NextResponse } from 'next/server';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';

export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const sb = supabaseServer();

  const userId = session.user.id;

  const [profile, residents, vehicles, bookings, washes, reviews, notifications] = await Promise.all([
    sb.from('profiles').select('*').eq('id', userId).maybeSingle(),
    sb.from('residents').select('*').eq('profile_id', userId),
    sb.from('vehicles').select('*, resident:residents!inner(profile_id)').eq('resident.profile_id', userId),
    sb.from('bookings').select('*, resident:residents!inner(profile_id)').eq('resident.profile_id', userId),
    sb.from('washes').select('*, resident:residents!inner(profile_id)').eq('resident.profile_id', userId),
    sb.from('wash_reviews').select('*, resident:residents!inner(profile_id)').eq('resident.profile_id', userId),
    sb.from('notifications').select('*').eq('recipient_id', userId),
  ]);

  const dump = {
    exported_at: new Date().toISOString(),
    profile: profile.data,
    residents: residents.data,
    vehicles: vehicles.data,
    bookings: bookings.data,
    washes: washes.data,
    reviews: reviews.data,
    notifications: notifications.data,
  };

  return new NextResponse(JSON.stringify(dump, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="lavo-export-${userId}.json"`,
    },
  });
}
