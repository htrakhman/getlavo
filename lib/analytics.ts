import posthog from 'posthog-js';

/**
 * Client-side PostHog events (initialized via PostHogProvider when NEXT_PUBLIC_POSTHOG_KEY is set).
 */
export function captureEvent(event: string, properties?: Record<string, unknown>) {
  if (typeof window === 'undefined' || !posthog.__loaded) return;
  posthog.capture(event, properties);
}
