'use client';

import { useEffect, useRef, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';

type PostHogConfig = { posthogKey: string | null; posthogHost: string };

let initPromise: Promise<void> | null = null;

function ensurePostHogInit(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (posthog.__loaded) return Promise.resolve();
  if (initPromise) return initPromise;

  initPromise = fetch('/api/config')
    .then((r) => r.json() as Promise<PostHogConfig>)
    .then(({ posthogKey, posthogHost }) => {
      if (!posthogKey || posthog.__loaded) return;
      posthog.init(posthogKey, {
        api_host: posthogHost || 'https://us.i.posthog.com',
        person_profiles: 'identified_only',
        capture_pageview: true,
      });
    })
    .catch(() => {});

  return initPromise;
}

export function PostHogInit() {
  useEffect(() => {
    void ensurePostHogInit();
  }, []);
  return null;
}

function PostHogPageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFirst = useRef(true);

  useEffect(() => {
    void ensurePostHogInit().then(() => {
      if (!posthog.__loaded) return;
      if (isFirst.current) {
        isFirst.current = false;
        return;
      }
      const search = searchParams.toString();
      const path = search ? `${pathname}?${search}` : pathname;
      posthog.capture('$pageview', { $current_url: window.location.origin + path });
    });
  }, [pathname, searchParams]);

  return null;
}

export function PostHogPageView() {
  return (
    <Suspense fallback={null}>
      <PostHogPageViewTracker />
    </Suspense>
  );
}
