/** Maps app signup/profile roles to portal_kind rows. */
export type SignupRole = 'building_manager' | 'operator' | 'resident';

export type PortalKind = 'building' | 'operator' | 'resident';

export function normalizeSignupRole(value: string | null | undefined): SignupRole | null {
  if (value === 'building_manager' || value === 'operator' || value === 'resident') return value;
  return null;
}

export function portalForSignupRole(role: SignupRole): PortalKind {
  if (role === 'building_manager') return 'building';
  if (role === 'operator') return 'operator';
  return 'resident';
}

/** Main app URL for a portal; onboarding is reached from these routes when setup is incomplete. */
export function homePathForPortalKind(portal: PortalKind): `/building` | `/operator` | `/resident` {
  if (portal === 'building') return '/building';
  if (portal === 'operator') return '/operator';
  return '/resident';
}

export function homePathForSignupRole(role: SignupRole): `/building` | `/operator` | `/resident` {
  return homePathForPortalKind(portalForSignupRole(role));
}

/** Login / nav `prefer` query uses portal_kind-style slugs (`building` | `operator` | `resident`). */
export function signupRoleFromPortalPrefer(value: string | null | undefined): SignupRole | null {
  if (value === 'building') return 'building_manager';
  if (value === 'operator') return 'operator';
  if (value === 'resident') return 'resident';
  return null;
}

/**
 * Pick which portal to open when a user has one or more portals.
 * Prefer the role hint when that portal is present; otherwise a stable priority (not arbitrary DB order).
 */
export function pickLandingPortal(
  portals: readonly string[],
  role: string | null | undefined
): PortalKind | null {
  const preferred =
    role === 'building_manager' ? 'building'
    : role === 'operator' ? 'operator'
    : role === 'resident' ? 'resident'
    : null;
  if (preferred && portals.includes(preferred)) return preferred;
  const priority: readonly PortalKind[] = ['building', 'operator', 'resident'];
  for (const p of priority) {
    if (portals.includes(p)) return p;
  }
  return null;
}
