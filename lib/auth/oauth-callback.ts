import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { homePathForPortalKind, normalizeSignupRole, pickLandingPortal, portalForSignupRole } from '@/lib/portal-routing';
import { notifySignup } from '@/lib/auth/notify-signup';
import { safeInternalPath } from '@/lib/safe-redirect';
import { QR_SLUG_COOKIE, logScanEvent } from '@/lib/qr-attribution';

export type OAuthCallbackOptions = {
  /** Optional segment from `/auth/callback/:signupRole` (legacy / extra allowlist entries). */
  roleFromPath?: string | null;
};

export async function handleOAuthCallback(request: NextRequest, options: OAuthCallbackOptions = {}) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const roleFromQuery = searchParams.get('role');
  const redirectParam = safeInternalPath(searchParams.get('redirect'));
  const cookieRole = request.cookies.get('oauth_signup_role')?.value;
  const pathRoleCandidate = options.roleFromPath ?? null;

  const pendingCookies: Array<{ name: string; value: string; options: CookieOptions }> = [];

  function redirectWithSessionCookies(targetUrl: string) {
    const response = NextResponse.redirect(targetUrl);
    pendingCookies.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options as CookieOptions);
    });
    response.cookies.set('oauth_signup_role', '', { path: '/', maxAge: 0 });
    return response;
  }

  if (!code) {
    return redirectWithSessionCookies(`${origin}/login?error=missing_code`);
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          pendingCookies.push(...cookiesToSet);
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return redirectWithSessionCookies(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return redirectWithSessionCookies(`${origin}/login?error=no_session`);
  }

  const role =
    normalizeSignupRole(roleFromQuery) ??
    normalizeSignupRole(pathRoleCandidate) ??
    normalizeSignupRole(cookieRole) ??
    normalizeSignupRole(
      user.user_metadata?.role != null ? String(user.user_metadata.role) : null
    );

  const [{ data: profile }, { data: portalRows }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
    supabase.from('profile_portals').select('portal').eq('profile_id', user.id),
  ]);

  const portals: string[] = (portalRows ?? []).map((r: { portal: string }) => r.portal);

  const requestedPortal = role ? portalForSignupRole(role) : null;

  let dest: string;

  if (profile) {
    if (requestedPortal && !portals.includes(requestedPortal)) {
      const [{ error: portalErr }] = await Promise.all([
        supabase.from('profile_portals').upsert({ profile_id: user.id, portal: requestedPortal }),
        supabase.from('profiles').update({ role }).eq('id', user.id),
      ]);
      if (portalErr) {
        return redirectWithSessionCookies(`${origin}/auth/pick-role?error=${encodeURIComponent(portalErr.message)}`);
      }
      dest = homePathForPortalKind(requestedPortal);
    } else {
      const target =
        requestedPortal && portals.includes(requestedPortal)
          ? requestedPortal
          : pickLandingPortal(portals, profile.role);
      dest = target === 'building' ? '/building'
           : target === 'operator' ? '/operator'
           : target === 'resident' ? '/resident'
           : profile.role === 'admin' ? '/admin'
           : '/auth/pick-role';
    }
  } else if (requestedPortal) {
    const fullName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split('@')[0] ||
      '';

    await supabase.from('profiles').upsert({
      id: user.id,
      role,
      full_name: fullName,
      email: user.email!,
    });
    const { error: portalErr } = await supabase.from('profile_portals').upsert({ profile_id: user.id, portal: requestedPortal });
    if (portalErr) {
      return redirectWithSessionCookies(`${origin}/auth/pick-role?error=${encodeURIComponent(portalErr.message)}`);
    }

    if (!user.user_metadata?.signup_notified) {
      await notifySignup({
        email: user.email!,
        name: fullName,
        role,
        method: 'google',
      });
      await supabase.auth.updateUser({ data: { signup_notified: true } }).catch(() => {});

      // Attribute the completed signup to the building QR that started the flow.
      const qrSlug = request.cookies.get(QR_SLUG_COOKIE)?.value;
      if (qrSlug) {
        await logScanEvent({
          slug: qrSlug,
          event: 'signup',
          profileId: user.id,
          userAgent: request.headers.get('user-agent'),
        });
      }
    }

    dest = homePathForPortalKind(requestedPortal);
  } else {
    dest = '/auth/pick-role';
  }

  if (role) {
    await supabase.auth.updateUser({ data: { role } }).catch(() => {});
  }

  // A validated redirect param (e.g. the QR funnel's /schedule?b={slug}) wins
  // over the default portal home — but never over pick-role/error routes.
  if (redirectParam && !dest.startsWith('/auth/')) {
    dest = redirectParam;
  }

  return redirectWithSessionCookies(`${origin}${dest}`);
}
