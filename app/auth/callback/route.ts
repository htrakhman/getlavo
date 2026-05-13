import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // role is set when coming from the signup page ("Sign up with Google")
  const role = searchParams.get('role');

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const pendingCookies: Array<{ name: string; value: string; options: CookieOptions }> = [];

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
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=no_session`);
  }

  // profile_portals is the source of truth post-migration 0006; profiles.role is a nullable legacy hint
  const [{ data: profile }, { data: portalRows }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
    supabase.from('profile_portals').select('portal').eq('profile_id', user.id),
  ]);

  const portals: string[] = (portalRows ?? []).map((r: { portal: string }) => r.portal);

  const requestedPortal = role === 'building_manager' ? 'building'
                        : role === 'operator' ? 'operator'
                        : role === 'resident' ? 'resident'
                        : null;

  let dest: string;

  if (profile) {
    if (requestedPortal && !portals.includes(requestedPortal)) {
      // Existing user accessing a new portal type — add it and send to onboarding
      const [{ error: portalErr }] = await Promise.all([
        supabase.from('profile_portals').upsert({ profile_id: user.id, portal: requestedPortal }),
        supabase.from('profiles').update({ role }).eq('id', user.id),
      ]);
      if (portalErr) {
        return NextResponse.redirect(`${origin}/auth/pick-role?error=${encodeURIComponent(portalErr.message)}`);
      }
      dest = role === 'building_manager' ? '/building/onboarding'
           : role === 'operator' ? '/operator/onboarding'
           : '/resident/onboarding';
    } else {
      // Route to: requested portal → preferred portal by profile.role → first portal → pick-role
      const preferredByRole = profile.role === 'building_manager' ? 'building'
                            : profile.role === 'operator' ? 'operator'
                            : profile.role === 'resident' ? 'resident'
                            : null;
      const target = requestedPortal
                  ?? (preferredByRole && portals.includes(preferredByRole) ? preferredByRole : null)
                  ?? portals[0]
                  ?? null;
      dest = target === 'building' ? '/building'
           : target === 'operator' ? '/operator'
           : target === 'resident' ? '/resident'
           : profile.role === 'admin' ? '/admin'
           : '/auth/pick-role';
    }
  } else if (requestedPortal) {
    // Brand-new Google user — create profile and portal entry
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
      return NextResponse.redirect(`${origin}/auth/pick-role?error=${encodeURIComponent(portalErr.message)}`);
    }

    dest = role === 'building_manager' ? '/building/onboarding'
         : role === 'operator' ? '/operator/onboarding'
         : '/resident/onboarding';
  } else {
    dest = '/auth/pick-role';
  }

  const response = NextResponse.redirect(`${origin}${dest}`);
  pendingCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options as CookieOptions);
  });
  return response;
}
