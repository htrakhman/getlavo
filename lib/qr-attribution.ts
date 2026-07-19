import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * Set by the /b/[slug] QR landing page (client-side) so server-side auth
 * callbacks (email confirm, Google OAuth) can attribute the completed signup
 * to the building whose QR code started the flow.
 */
export const QR_SLUG_COOKIE = 'lavo_qr_slug';

export type ScanEventType = 'page_view' | 'signup';

/**
 * Records a QR-funnel event. Never throws — attribution must not be able to
 * break the landing, signup, or booking flows.
 */
export async function logScanEvent(opts: {
  slug: string;
  event: ScanEventType;
  buildingId?: string | null;
  profileId?: string | null;
  userAgent?: string | null;
  referrer?: string | null;
}): Promise<void> {
  try {
    const admin = supabaseAdmin();
    let buildingId = opts.buildingId ?? null;
    if (!buildingId) {
      const { data } = await admin.from('buildings').select('id').eq('slug', opts.slug).maybeSingle();
      buildingId = data?.id ?? null;
    }
    await admin.from('building_scan_events').insert({
      slug: opts.slug,
      building_id: buildingId,
      event_type: opts.event,
      profile_id: opts.profileId ?? null,
      user_agent: opts.userAgent?.slice(0, 500) ?? null,
      referrer: opts.referrer?.slice(0, 500) ?? null,
    });
  } catch (e) {
    console.error('[qr-attribution] failed to log event:', (e as Error).message);
  }
}
