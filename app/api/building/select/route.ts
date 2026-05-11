import { NextResponse } from 'next/server';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { BUILDING_COOKIE } from '@/lib/building';

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { buildingId } = await req.json();
  if (!buildingId) return NextResponse.json({ error: 'missing id' }, { status: 400 });

  // Verify the manager owns this building before letting them switch to it.
  const sb = supabaseServer();
  const { data: ok } = await sb
    .from('buildings')
    .select('id')
    .eq('id', buildingId)
    .eq('manager_id', session.user.id)
    .maybeSingle();
  if (!ok) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const res = NextResponse.json({ success: true });
  res.cookies.set(BUILDING_COOKIE, buildingId, {
    path: '/',
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
