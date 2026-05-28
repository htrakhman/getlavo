import { supabaseAdmin } from '@/lib/supabase/admin';
import { wrapEmail, paragraph, button } from '@/lib/email/template';
import { notify } from '@/lib/notify';
import { isBuildingBookable } from '@/lib/building-live';
import {
  backfillWaitlistBuildingId,
  findUnnotifiedWaitlist,
  type BuildingForMatch,
  type WaitlistRow,
} from '@/lib/building-waitlist-match';

const APP = () => process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://getlavo.io';

async function loadBuilding(admin: ReturnType<typeof supabaseAdmin>, buildingId: string) {
  const { data } = await admin
    .from('buildings')
    .select('id, name, slug, google_place_id, address_line1, city, region')
    .eq('id', buildingId)
    .maybeSingle();
  return data as BuildingForMatch | null;
}

async function createActivationPromo(admin: ReturnType<typeof supabaseAdmin>, building: BuildingForMatch) {
  const slug = building.slug || building.id.slice(0, 8);
  const expires = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const code = `JOIN-${String(slug).toUpperCase().replace(/[^A-Z0-9]/g, '')}-${Math.random().toString(36).slice(2, 8)}`.slice(0, 40);

  await admin.from('promo_codes').insert({
    code,
    description: `Waitlist activation for ${building.name}`,
    discount_kind: 'free_first_wash',
    applies_first_booking_only: true,
    max_redemptions: null,
    expires_at: expires,
    active: true,
  });

  return code;
}

async function sendWaitlistNotifications(
  building: BuildingForMatch,
  rows: WaitlistRow[],
  code: string,
  subjectSuffix: string,
) {
  const slug = building.slug || building.id.slice(0, 8);
  const admin = supabaseAdmin();
  const from = process.env.RESEND_FROM_EMAIL || 'Lavo <harold@getlavo.io>';
  const Resend = (await import('resend')).Resend;
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  const link = `${APP()}/signup?role=resident&building=${encodeURIComponent(slug)}&promo=${encodeURIComponent(code)}`;
  const bodyText = `${building.name} is live on Lavo. Your first wash is covered. Use code ${code} at checkout. Book here: ${link}`;

  for (const row of rows) {
    try {
      if (row.profile_id) {
        await notify(row.profile_id, 'waitlist_building_live', {
          buildingName: building.name,
          code,
          link: `/signup?role=resident&building=${encodeURIComponent(slug)}&promo=${encodeURIComponent(code)}`,
          cta: 'Book your first wash',
        });
      } else if (row.email && resend) {
        const inner = [
          paragraph(`Hi${row.full_name ? ` ${row.full_name.split(' ')[0]}` : ''},`),
          paragraph(
            `${building.name} is live on Lavo. Here is your one-time first wash credit. It expires in 14 days.`,
          ),
          paragraph(`Use code <strong>${code}</strong> when you book.`),
          button(link, 'Create your account and book'),
        ].join('');
        await resend.emails.send({
          from,
          to: row.email,
          subject: `${building.name} is on Lavo${subjectSuffix}`,
          html: wrapEmail({ preheader: bodyText, content: inner }),
        });
      }

      if (
        row.phone &&
        process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        process.env.TWILIO_PHONE_NUMBER
      ) {
        const auth = Buffer.from(
          `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`,
        ).toString('base64');
        await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
          {
            method: 'POST',
            headers: {
              Authorization: `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              From: process.env.TWILIO_PHONE_NUMBER,
              To: row.phone,
              Body: bodyText,
            }),
          },
        );
      }
    } catch (e) {
      console.error('waitlist notify row', row.id, e);
      continue;
    }

    await admin
      .from('building_waitlist')
      .update({
        building_id: building.id,
        activation_promo_code: code,
        notified_activation_at: new Date().toISOString(),
      })
      .eq('id', row.id);
  }
}

/**
 * Notify matched waitlist residents when the building is bookable.
 * Safe to call multiple times — skips rows already marked notified_activation_at.
 */
export async function notifyBuildingWaitlist(buildingId: string, trigger: 'activation' | 'first_wash_day' = 'activation') {
  const admin = supabaseAdmin();
  const building = await loadBuilding(admin, buildingId);
  if (!building) return { notified: 0, skipped: 'building_not_found' as const };

  const bookable = await isBuildingBookable(admin, buildingId);
  if (!bookable && trigger === 'activation') {
    return { notified: 0, skipped: 'not_bookable' as const };
  }

  const rows = await findUnnotifiedWaitlist(admin, building);
  if (rows.length === 0) return { notified: 0, skipped: 'no_waitlist' as const };

  const code = await createActivationPromo(admin, building);
  const suffix = trigger === 'first_wash_day' ? ' — first wash day' : '';
  await sendWaitlistNotifications(building, rows, code, suffix);

  return { notified: rows.length, code };
}

/** Admin assigned operator — building marked active. */
export async function onBuildingActivated(buildingId: string) {
  const admin = supabaseAdmin();
  const building = await loadBuilding(admin, buildingId);
  if (!building) return;

  await notifyBuildingWaitlist(buildingId, 'activation');
}

/**
 * Call when partnership goes active or packages may now exist.
 * Only emails waitlist if the building is actually bookable.
 */
export async function maybeNotifyBuildingLive(buildingId: string) {
  const admin = supabaseAdmin();
  if (!(await isBuildingBookable(admin, buildingId))) {
    const building = await loadBuilding(admin, buildingId);
    if (building) await backfillWaitlistBuildingId(admin, building);
    return { notified: 0, skipped: 'not_bookable' as const };
  }
  return notifyBuildingWaitlist(buildingId, 'activation');
}

/** After the first completed wash day, notify any waitlist rows still waiting. */
export async function onFirstWashDayCompleted(buildingId: string) {
  const admin = supabaseAdmin();
  const { count } = await admin
    .from('wash_days')
    .select('*', { count: 'exact', head: true })
    .eq('building_id', buildingId)
    .not('completed_at', 'is', null);

  if ((count ?? 0) !== 1) return { notified: 0, skipped: 'not_first_wash_day' as const };

  return notifyBuildingWaitlist(buildingId, 'first_wash_day');
}
