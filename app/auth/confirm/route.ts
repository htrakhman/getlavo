import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { homePathForSignupRole, normalizeSignupRole, pickLandingPortal, portalForSignupRole } from '@/lib/portal-routing';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as 'email' | 'recovery' | 'invite' | null;
  const role = normalizeSignupRole(searchParams.get('role'));
  const next = searchParams.get('next');

  if (!token_hash || !type) {
    return NextResponse.redirect(`${origin}/login?error=missing_token`);
  }

  const pendingCookies: Array<{ name: string; value: string; options: CookieOptions }> = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          pendingCookies.push(...cookiesToSet);
        },
      },
    }
  );

  const { error } = await supabase.auth.verifyOtp({ token_hash, type });

  function redirect(url: string) {
    const response = NextResponse.redirect(url);
    pendingCookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
    return response;
  }

  if (error) {
    return redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  // Password reset — send to the reset page
  if (type === 'recovery') {
    return redirect(`${origin}/reset-password`);
  }

  // If a next= param was passed, honour it (must be a known portal path)
  const PORTAL_PATHS = ['/resident', '/building', '/operator'] as const;
  if (next && PORTAL_PATHS.includes(next as (typeof PORTAL_PATHS)[number])) {
    return redirect(`${origin}${next}`);
  }

  // Resolve destination from role
  if (role) {
    const dest = homePathForSignupRole(role);
    return redirect(`${origin}${dest}`);
  }

  // Fall back: look up profile to find the right portal
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const [{ data: profile }, { data: portalRows }] = await Promise.all([
      supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
      supabase.from('profile_portals').select('portal').eq('profile_id', user.id),
    ]);
    const portals = (portalRows ?? []).map((r: { portal: string }) => r.portal);
    const landing = pickLandingPortal(portals, profile?.role);
    if (landing) return redirect(`${origin}/${landing}`);
    if (profile?.role === 'admin') return redirect(`${origin}/admin`);
  }

  return redirect(`${origin}/auth/pick-role`);
}
