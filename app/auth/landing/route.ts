import { NextResponse, type NextRequest } from 'next/server';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { landingPathForPortals } from '@/lib/portal-routing';
import { expiredSessionLoginHref } from '@/lib/auth/landing';
import { safeInternalPath } from '@/lib/safe-redirect';

export const dynamic = 'force-dynamic';

/**
 * Resolves where an authenticated visitor belongs and forwards them there.
 *
 * Used when a signed-out-only page (`/signup`, `/login`) finds a live session —
 * most often a back-navigation restoring one of those pages from the bfcache
 * mid-onboarding. The portal decision happens here rather than in the browser
 * because the server reads profiles/portals with the service role, the same way
 * every portal layout does; the client's RLS-scoped reads can come back empty and
 * would strand a resident on pick-role.
 */
export async function GET(request: NextRequest) {
  const { origin, searchParams } = new URL(request.url);
  const next = safeInternalPath(searchParams.get('next'));

  const { data: { user } } = await supabaseServer().auth.getUser();
  if (!user) {
    return redirectTo(origin, expiredSessionLoginHref(next));
  }

  if (next) return redirectTo(origin, next);

  const session = await getSessionUser();
  const dest = session
    ? landingPathForPortals(session.portals, session.profile.role)
    : // Authenticated but no profile/role resolved yet — let them pick.
      '/auth/pick-role';
  return redirectTo(origin, dest);
}

function redirectTo(origin: string, path: string) {
  const response = NextResponse.redirect(new URL(path, origin));
  // This redirect is per-visitor: never let it be reused for someone else.
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
