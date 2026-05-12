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

  let dest: string;

  if (profile) {
    dest = profile.role === 'building_manager' ? '/building'
         : profile.role === 'operator' ? '/operator'
         : '/resident/onboarding';
  } else if (role && ['building_manager', 'operator', 'resident'].includes(role)) {
    // New Google user — create profile
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
