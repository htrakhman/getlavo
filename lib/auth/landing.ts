/**
 * URLs shared by the signed-out-only pages (`/signup`, `/login`), the client hook
 * that bounces an already-authenticated visitor off them, and the `/auth/landing`
 * route that resolves where that visitor actually belongs.
 *
 * Safe to import from both client and server code.
 */
import { safeInternalPath } from '@/lib/safe-redirect';

export const LANDING_PATH = '/auth/landing';

/**
 * Marker `/auth/landing` adds when the browser held a session the server does not
 * accept. Without it, the bounce would be a loop: the client keeps seeing a session
 * in cookies, `/auth/landing` keeps sending it back to `/login`.
 */
export const EXPIRED_SESSION_PARAM = 'session';
export const EXPIRED_SESSION_VALUE = 'expired';

function withNext(path: string, next: string | null | undefined): string {
  const target = safeInternalPath(next);
  return target ? `${path}${path.includes('?') ? '&' : '?'}next=${encodeURIComponent(target)}` : path;
}

/** Where a page that only makes sense for signed-out visitors sends a signed-in one. */
export function landingHref(next?: string | null): string {
  return withNext(LANDING_PATH, next);
}

/** Where `/auth/landing` sends a visitor whose session the server rejected. */
export function expiredSessionLoginHref(next?: string | null): string {
  return withNext(`/login?${EXPIRED_SESSION_PARAM}=${EXPIRED_SESSION_VALUE}`, next);
}

/** True when the current URL already carries the expired-session marker. */
export function hasExpiredSessionMarker(search: string): boolean {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  return params.get(EXPIRED_SESSION_PARAM) === EXPIRED_SESSION_VALUE;
}
