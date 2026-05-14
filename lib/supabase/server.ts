import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { portalKindFromProfileRole } from '@/lib/portal-routing';

export function supabaseServer() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}

export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export type Portal = 'building' | 'operator' | 'resident';

function portalsFromProfileRole(role: string | null | undefined): Portal[] {
  const k = portalKindFromProfileRole(role);
  return k ? [k] : [];
}

export async function getSessionUser() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const [{ data: profile }, { data: portalRows }] = await Promise.all([
    sb.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    sb.from('profile_portals').select('portal').eq('profile_id', user.id),
  ]);
  if (!profile) return null;
  const fromJunction = (portalRows ?? []).map((r) => r.portal as Portal);
  const portals = fromJunction.length > 0 ? fromJunction : portalsFromProfileRole(profile.role as string | null);
  return { user, profile, portals };
}
