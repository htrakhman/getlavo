import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { normalizeSignupRole, portalKindFromProfileRole } from '@/lib/portal-routing';
import { isAdminEmail } from '@/lib/auth/admin-emails';

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

  // Service-role reads: the user is already authenticated above, and RLS-scoped
  // profile/portal reads have failed in production (missing grants), which made
  // every portal fall back to bare auth metadata and lose portal membership.
  const admin = supabaseAdmin();
  const [{ data: profile }, { data: portalRows }] = await Promise.all([
    admin.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    admin.from('profile_portals').select('portal').eq('profile_id', user.id),
  ]);

  let resolvedProfile: SessionProfile | (typeof profile) | null =
    profile ??
    profileFromUserMetadata(user);

  // Admin is granted by email (e.g. the founder via Google SSO): force the
  // admin role even if the stored profile says otherwise, and create a minimal
  // profile when the row doesn't exist yet so the account is never bounced to
  // the operator-application flow.
  if (isAdminEmail(user.email)) {
    const base = resolvedProfile ?? {
      id: user.id,
      full_name: (user.email?.split('@')[0] ?? 'Admin'),
      email: user.email ?? '',
    };
    resolvedProfile = { ...base, role: 'admin' } as SessionProfile;
    if ((profile as any)?.role !== 'admin') {
      // Best-effort: persist so role-based reads elsewhere agree. Never fatal.
      admin
        .from('profiles')
        .upsert({ id: user.id, role: 'admin', email: user.email ?? null }, { onConflict: 'id' })
        .then(() => {}, () => {});
    }
  }

  if (!resolvedProfile) return null;

  const fromJunction = (portalRows ?? []).map((r) => r.portal as Portal);
  const portals =
    fromJunction.length > 0 ? fromJunction : portalsFromProfileRole(resolvedProfile.role as string | null);

  return { user, profile: resolvedProfile, portals };
}
