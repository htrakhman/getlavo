import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { finalizeOAuthSession } from '@/lib/auth/finalize-oauth-session';

/** Completes sign-in after Google Identity Services + signInWithIdToken (no Supabase OAuth redirect). */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const roleFromQuery = searchParams.get('role');
  const cookieRole = request.cookies.get('oauth_signup_role')?.value;
  const nextRaw = searchParams.get('next');

  const pendingCookies: Array<{ name: string; value: string; options: CookieOptions }> = [];

  function redirectWithSessionCookies(targetUrl: string) {
    const response = NextResponse.redirect(targetUrl);
    pendingCookies.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options as CookieOptions);
    });
    response.cookies.set('oauth_signup_role', '', { path: '/', maxAge: 0 });
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          pendingCookies.push(...cookiesToSet);
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return redirectWithSessionCookies(`${origin}/login?error=no_session`);
  }

  if (nextRaw === '/resident' || nextRaw === '/building' || nextRaw === '/operator') {
    return redirectWithSessionCookies(`${origin}/auth/continue?next=${encodeURIComponent(nextRaw)}`);
  }

  const { dest, error } = await finalizeOAuthSession({
    supabase,
    user,
    roleFromQuery,
    roleFromCookie: cookieRole,
  });

  if (error) {
    return redirectWithSessionCookies(`${origin}/auth/pick-role?error=${encodeURIComponent(error)}`);
  }

  return redirectWithSessionCookies(`${origin}${dest}`);
}
