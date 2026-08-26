import { NextResponse } from 'next/server';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { BUILDING_COOKIE } from '@/lib/building';

/**
 * Switch by link rather than by fetch. A notification points at a page under
 * one specific building, which is often not the one currently open — set the
 * cookie and carry on to the target so the whole shell agrees on which
 * building is active.
 */
export async function GET(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.redirect(new URL('/login', req.url));

  const url = new URL(req.url);
  const buildingId = url.searchParams.get('buildingId') ?? '';
  const next = url.searchParams.get('next') ?? '';
  // Only same-origin relative paths: a redirect target off a query string
  // must never be able to send someone to another host.
  const dest = next.startsWith('/') && !next.startsWith('//') ? next : '/building';
  const fallback = NextResponse.redirect(new URL('/building', req.url));
  if (!buildingId) return fallback;

  const sb = supabaseServer();
  const { data: ok } = await sb
    .from('buildings')
    .select('id')
    .eq('id', buildingId)
    .eq('manager_id', session.user.id)
    .maybeSingle();
  if (!ok) return fallback;

  const res = NextResponse.redirect(new URL(dest, req.url));
  res.cookies.set(BUILDING_COOKIE, buildingId, {
    path: '/',
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}

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
