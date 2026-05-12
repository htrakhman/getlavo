import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

type RoleStr = 'building_manager' | 'operator' | 'resident';
const VALID_ROLES: RoleStr[] = ['building_manager', 'operator', 'resident'];

function roleToPortal(r: string) {
  return r === 'building_manager' ? 'building' : r === 'operator' ? 'operator' : 'resident';
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // role is set when coming from the signup page ("Sign up with Google")
  const role = searchParams.get('role');

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  // Collect cookies to set on the final response
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

  // Check whether this user already has a profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  async function upsertRole(r: string, fullName: string) {
    await supabase.from('profiles').upsert({ id: user!.id, role: r, full_name: fullName, email: user!.email! });
    await supabase.from('profile_portals').upsert({ profile_id: user!.id, portal: roleToPortal(r) });
  }

  let dest: string;

  if (role && VALID_ROLES.includes(role as RoleStr)) {
    // Explicit role from the signup page. Always upsert so the intended role
    // wins even if the DB trigger already created the row with a different default.
    // Also add the portal to profile_portals so multi-role access works.
    const fullName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split('@')[0] ||
      '';
    await upsertRole(role, fullName);
    dest = role === 'building_manager' ? '/building/onboarding'
         : role === 'operator' ? '/operator/onboarding'
         : '/resident/onboarding';
  } else if (profile) {
    // Returning user (sign-in, no role in URL) — route by stored role.
    // For email users, auth metadata holds the role from sign-up options.data;
    // if the DB has null/resident but metadata says otherwise, correct it.
    let effectiveRole = profile.role as string | null;
    const metaRole = user.user_metadata?.role as string | undefined;
    if (
      metaRole &&
      VALID_ROLES.includes(metaRole as RoleStr) &&
      metaRole !== effectiveRole &&
      (effectiveRole === null || effectiveRole === undefined || effectiveRole === 'resident')
    ) {
      const fullName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split('@')[0] ||
        '';
      await upsertRole(metaRole, fullName);
      effectiveRole = metaRole;
    }
    dest = effectiveRole === 'building_manager' ? '/building'
         : effectiveRole === 'operator' ? '/operator'
         : effectiveRole === 'resident' ? '/resident'
         : '/auth/pick-role';
  } else {
    // No profile and no role URL param — new user via login page.
    // Fall back to metadata role (set during email sign-up) if the trigger failed.
    const metaRole = user.user_metadata?.role as string | undefined;
    if (metaRole && VALID_ROLES.includes(metaRole as RoleStr)) {
      const fullName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split('@')[0] ||
        '';
      await upsertRole(metaRole, fullName);
      dest = metaRole === 'building_manager' ? '/building/onboarding'
           : metaRole === 'operator' ? '/operator/onboarding'
           : '/resident/onboarding';
    } else {
      dest = '/auth/pick-role';
    }
  }

  const response = NextResponse.redirect(`${origin}${dest}`);
  pendingCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options as CookieOptions);
  });
  return response;
}
