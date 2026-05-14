import { NextRequest, NextResponse } from 'next/server';
import { normalizeSignupRole } from '@/lib/portal-routing';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const role = normalizeSignupRole(typeof body?.role === 'string' ? body.role : undefined);
  if (!role) {
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
