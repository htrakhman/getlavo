import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { normalizeSignupRole, portalKindFromProfileRole } from '@/lib/portal-routing';

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

/** Minimal profile shape for layouts when the DB row is not visible yet (trigger lag) but auth metadata has role. */
export type SessionProfile = {
  id: string;
  role: string | null;
  full_name: string;
  email: string;
};

function portalsFromProfileRole(role: string | null | undefined): Portal[] {
  const k = portalKindFromProfileRole(role);
  return k ? [k] : [];
}

function profileFromUserMetadata(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}): SessionProfile | null {
  const meta = user.user_metadata ?? {};
  const role = normalizeSignupRole(
    typeof meta.role === 'string' ? meta.role : null
  );
  if (!role) return null;
  const fullName =
    (typeof meta.full_name === 'string' && meta.full_name) ||
    (typeof meta.name === 'string' && meta.name) ||
    (user.email?.split('@')[0] ?? '');
  return {
    id: user.id,
    role,
    full_name: fullName,
    email: user.email ?? '',
  };
}

export async function getSessionUser() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: portalRows }] = await Promise.all([
    sb.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    sb.from('profile_portals').select('portal').eq('profile_id', user.id),
  ]);

  const resolvedProfile: SessionProfile | (typeof profile) | null =
    profile ??
    profileFromUserMetadata(user);

  if (!resolvedProfile) return null;

  const fromJunction = (portalRows ?? []).map((r) => r.portal as Portal);
  const portals =
    fromJunction.length > 0 ? fromJunction : portalsFromProfileRole(resolvedProfile.role as string | null);

  return { user, profile: resolvedProfile, portals };
}
