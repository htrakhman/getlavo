import { NextResponse } from 'next/server';

/** Public runtime config for the browser (no secrets beyond the PostHog project key). */
export async function GET() {
  const posthogKey =
    process.env.POSTHOG_KEY?.trim() ||
    process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim() ||
    null;
  const posthogHost =
    process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || 'https://us.i.posthog.com';

  return NextResponse.json({ posthogKey, posthogHost });
}
