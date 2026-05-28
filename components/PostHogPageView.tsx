'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { usePostHog } from 'posthog-js/react';
import { useEffect, useRef } from 'react';

export function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const posthog = usePostHog();
  const isFirst = useRef(true);

  useEffect(() => {
    if (!posthog || !pathname) return;

    // Initial pageview is sent by posthog.init (capture_pageview: true).
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }

    let url = window.location.origin + pathname;
    const query = searchParams?.toString();
    if (query) url += `?${query}`;

    const capture = () => {
      if (!posthog.__loaded) return false;
      posthog.capture('$pageview', { $current_url: url });
      return true;
    };

    if (capture()) return;

    const interval = window.setInterval(() => {
      if (capture()) window.clearInterval(interval);
    }, 50);

    return () => window.clearInterval(interval);
  }, [pathname, searchParams, posthog]);

  return null;
}
