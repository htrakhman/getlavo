import posthog from 'posthog-js';

/**
 * Client-side PostHog events (initialized via PostHogInit after /api/config loads the project key).
 */
export async function captureEvent(event: string, properties?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  if (!posthog.__loaded) {
    try {
      const { posthogKey, posthogHost } = (await fetch('/api/config').then((r) => r.json())) as {
        posthogKey: string | null;
        posthogHost?: string;
      };
      if (posthogKey) {
        posthog.init(posthogKey, {
          api_host: posthogHost || 'https://us.i.posthog.com',
          person_profiles: 'identified_only',
        });
      }
    } catch {
      return;
    }
  }
  if (!posthog.__loaded) return;
  posthog.capture(event, properties);
}
