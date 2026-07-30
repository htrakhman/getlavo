'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { hasExpiredSessionMarker, landingHref } from '@/lib/auth/landing';

/**
 * Keeps `/signup` and `/login` from lying to a visitor who already has a session.
 *
 * Pressing the browser's back button mid-onboarding restores these pages from the
 * back/forward cache exactly as they were rendered for an anonymous visitor — a
 * fresh "Create your account" form — even though the account and onboarding
 * progress are intact. A bfcache restore does not re-run React effects (the page
 * is resumed, not re-mounted), so the session is re-checked on `pageshow` as well
 * as on mount, and an authenticated visitor is handed to `/auth/landing`, which
 * resolves their real destination server-side.
 *
 * Returns true once a redirect is under way so the caller can render an
 * interstitial instead of the misleading form.
 */
export function useSignedInRedirect(next?: string | null): boolean {
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const dest = landingHref(next);

    async function check() {
      // The server already rejected this browser's session — do not bounce again.
      if (hasExpiredSessionMarker(window.location.search)) return;
      // Reads the auth cookies as they are right now, not as they were when this
      // page was first rendered, which is what makes the bfcache case work.
      const { data: { session } } = await supabaseBrowser().auth.getSession();
      if (cancelled || !session) return;
      setRedirecting(true);
      window.location.replace(dest);
    }

    void check();

    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) void check();
    }
    window.addEventListener('pageshow', onPageShow);
    return () => {
      cancelled = true;
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [next]);

  return redirecting;
}
