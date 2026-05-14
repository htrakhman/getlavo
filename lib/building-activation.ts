import { supabaseAdmin } from '@/lib/supabase/admin';
import { wrapEmail, paragraph, button } from '@/lib/email/template';
import { notify } from '@/lib/notify';

const APP = () => process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://getlavo.io';

/** After a building goes live with an operator, notify everyone on the waitlist and issue a short-lived promo. */
export async function onBuildingActivated(buildingId: string) {
  const admin = supabaseAdmin();
  const { data: building } = await admin
    .from('buildings')
    .select('id, name, slug, google_place_id')
    .eq('id', buildingId)
    .maybeSingle();
  if (!building) return;

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

  const keys: string[] = [`place:${building.google_place_id}`].filter((k) => k !== 'place:null' && k !== 'place:undefined');

  let q = admin
    .from('building_waitlist')
    .select('id, email, phone, profile_id, full_name')
    .eq('building_id', buildingId)
    .is('notified_activation_at', null);
  const { data: byBuilding } = await q;
  const lists = [...(byBuilding ?? [])];

  for (const ck of keys) {
    const { data: byKey } = await admin
      .from('building_waitlist')
      .select('id, email, phone, profile_id, full_name')
      .eq('building_candidate_key', ck)
      .is('notified_activation_at', null);
    for (const row of byKey ?? []) {
      if (!lists.find((l) => l.id === row.id)) lists.push(row);
    }
  }

  const from = process.env.RESEND_FROM_EMAIL || 'Lavo <hello@getlavo.io>';
  const Resend = (await import('resend')).Resend;
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

  for (const row of lists) {
    const link = `${APP()}/signup?role=resident&building=${encodeURIComponent(slug)}&promo=${encodeURIComponent(code)}`;
    const bodyText = `${building.name} is live on Lavo. Your first wash is covered. Use code ${code} at checkout. Book here: ${link}`;

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
          paragraph(`${building.name} is live on Lavo. Here is your one-time first wash credit. It expires in 14 days.`),
          paragraph(`Use code <strong>${code}</strong> when you book.`),
          button(link, 'Create your account and book'),
        ].join('');
        await resend.emails.send({
          from,
          to: row.email,
          subject: `${building.name} is on Lavo`,
          html: wrapEmail({ preheader: bodyText, content: inner }),
        });
      }

      if (row.phone && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
        const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
        await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`, {
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
        });
      }
    } catch (e) {
      console.error('waitlist notify row', row.id, e);
      continue;
    }

    await admin
      .from('building_waitlist')
      .update({ activation_promo_code: code, notified_activation_at: new Date().toISOString() })
      .eq('id', row.id);
  }
}
