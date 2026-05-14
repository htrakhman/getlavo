import { NextRequest, NextResponse } from 'next/server';

const ALLOWED = new Set(['building_manager', 'operator', 'resident']);

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const role = typeof body?.role === 'string' ? body.role : '';
  if (!ALLOWED.has(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('oauth_signup_role', role, {
    path: '/',
    maxAge: 600,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  return res;
}
