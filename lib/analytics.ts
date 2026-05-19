/**
 * Client-side PostHog events (script loaded in root layout when NEXT_PUBLIC_POSTHOG_KEY is set).
 */

export const ANALYTICS_EVENTS = {
  building_not_live_viewed: 'building_not_live_viewed',
  building_request_submitted: 'building_request_submitted',
  building_contact_email_added: 'building_contact_email_added',
  building_contact_email_sent: 'building_contact_email_sent',
  internal_request_email_sent: 'internal_request_email_sent',
  building_share_link_copied: 'building_share_link_copied',
} as const;

export function captureEvent(event: string, properties?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  const ph = (window as unknown as { posthog?: { capture?: (e: string, p?: Record<string, unknown>) => void } }).posthog;
  ph?.capture?.(event, properties);
}
