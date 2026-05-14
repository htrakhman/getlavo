/**
 * Client-side PostHog events (script loaded in root layout when NEXT_PUBLIC_POSTHOG_KEY is set).
 */
export function captureEvent(event: string, properties?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  const ph = (window as unknown as { posthog?: { capture?: (e: string, p?: Record<string, unknown>) => void } }).posthog;
  ph?.capture?.(event, properties);
}
