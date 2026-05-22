import type { SupabaseClient, User } from '@supabase/supabase-js';
import {
  homePathForPortalKind,
  normalizeSignupRole,
  pickLandingPortal,
  portalForSignupRole,
} from '@/lib/portal-routing';

export type FinalizeOAuthSessionInput = {
  supabase: SupabaseClient;
  user: User;
  roleFromQuery?: string | null;
  roleFromCookie?: string | null;
  roleFromPath?: string | null;
};

/** Profile/portal routing after Google or OAuth code exchange. Returns a path (with leading slash). */
export async function finalizeOAuthSession({
  supabase,
  user,
  roleFromQuery,
  roleFromCookie,
  roleFromPath,
}: FinalizeOAuthSessionInput): Promise<{ dest: string; error?: string }> {
  const role =
    normalizeSignupRole(roleFromQuery) ??
    normalizeSignupRole(roleFromPath) ??
    normalizeSignupRole(roleFromCookie) ??
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
        return { dest: '/auth/pick-role', error: portalErr.message };
      }
      dest = homePathForPortalKind(requestedPortal);
    } else {
      const target =
        requestedPortal && portals.includes(requestedPortal)
          ? requestedPortal
          : pickLandingPortal(portals, profile.role);
      dest =
        target === 'building'
          ? '/building'
          : target === 'operator'
            ? '/operator'
            : target === 'resident'
              ? '/resident'
              : profile.role === 'admin'
                ? '/admin'
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
    const { error: portalErr } = await supabase
      .from('profile_portals')
      .upsert({ profile_id: user.id, portal: requestedPortal });
    if (portalErr) {
      return { dest: '/auth/pick-role', error: portalErr.message };
    }

    dest = homePathForPortalKind(requestedPortal);
  } else {
    dest = '/auth/pick-role';
  }

  if (role) {
    await supabase.auth.updateUser({ data: { role } }).catch(() => {});
  }

  return { dest };
}
