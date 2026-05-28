/**
 * Client-side PostHog events (initialized in PostHogProvider when NEXT_PUBLIC_POSTHOG_KEY is set).
 */

import posthog from 'posthog-js';

export const ANALYTICS_EVENTS = {
  building_not_live_viewed: 'building_not_live_viewed',
  building_request_submitted: 'building_request_submitted',
  building_contact_email_added: 'building_contact_email_added',
  building_contact_email_sent: 'building_contact_email_sent',
  internal_request_email_sent: 'internal_request_email_sent',
  building_share_link_copied: 'building_share_link_copied',
} as const;

export function captureEvent(event: string, properties?: Record<string, unknown>) {
  if (typeof window === 'undefined' || !process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  posthog.capture(event, properties);
}
