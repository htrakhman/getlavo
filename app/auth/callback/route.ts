import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // role is set when coming from the signup page ("Sign up with Google")
  const role = searchParams.get('role');

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) {
          try { cookieStore.set({ name, value, ...options }); } catch {}
        },
        remove(name: string, options: CookieOptions) {
          try { cookieStore.set({ name, value: '', ...options }); } catch {}
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=oauth_error`);
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

  if (profile) {
    // Existing user — send them to their portal
    const dest = profile.role === 'building_manager' ? '/building'
               : profile.role === 'operator' ? '/operator'
               : '/resident/onboarding';
    return NextResponse.redirect(`${origin}${dest}`);
  }

  // New Google user — create profile if role is known, otherwise pick role
  if (role && ['building_manager', 'operator', 'resident'].includes(role)) {
    const fullName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split('@')[0] ||
      '';

    await supabase.from('profiles').insert({
      id: user.id,
      role,
      full_name: fullName,
      email: user.email!,
    });

    const dest = role === 'building_manager' ? '/building/onboarding'
               : role === 'operator' ? '/operator/onboarding'
               : '/resident/onboarding';
    return NextResponse.redirect(`${origin}${dest}`);
  }

  // No role provided — send to role picker
  return NextResponse.redirect(`${origin}/auth/pick-role`);
}
