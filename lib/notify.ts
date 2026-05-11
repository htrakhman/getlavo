import { supabaseAdmin } from '@/lib/supabase/admin';
import { wrapEmail, paragraph, button, escape as esc } from '@/lib/email/template';

type NotificationType =
  | 'wash_complete'
  | 'wash_flagged'
  | 'wash_reminder'
  | 'payment_failed'
  | 'pilot_signed'
  | 'operator_assigned';

export async function notify(profileId: string, type: NotificationType, data: Record<string, any>) {
  const sb = supabaseAdmin();
  const { data: profile } = await sb.from('profiles').select('email, phone, full_name').eq('id', profileId).maybeSingle();
  if (!profile) return;

  const { data: resident } = await sb
    .from('residents')
    .select('notification_preferences')
    .eq('profile_id', profileId)
    .maybeSingle();
  const prefs = (resident?.notification_preferences ?? {}) as Record<string, boolean>;
  const allowEmail = prefRespects(type, prefs, 'email');
  const allowSms = prefRespects(type, prefs, 'sms');

  const titles: Record<NotificationType, string> = {
    wash_complete: 'Your car is done ✨',
    wash_flagged: "We couldn't complete your wash",
    wash_reminder: 'Your wash is tomorrow',
    payment_failed: 'Payment issue — update your card',
    pilot_signed: 'Pilot agreement signed',
    operator_assigned: 'Your car wash crew is set',
  };

  const body = renderBody(type, data);

  await sb.from('notifications').insert({
    recipient_id: profileId,
    kind: type,
    title: titles[type],
    body,
    link: data.link ?? null,
  });

  if (process.env.RESEND_API_KEY && profile.email && allowEmail) {
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      const greetName = profile.full_name?.split(' ')[0] ?? '';
      const link = data.link ?? null;
      const inner = [
        paragraph(greetName ? `Hi ${greetName},` : 'Hello,'),
        paragraph(body),
        link ? button(linkAbsolute(link), data.cta ?? 'View in app') : '',
      ].join('');
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'Lavo <hello@getlavo.io>',
        to: profile.email,
        subject: titles[type],
        html: wrapEmail({ preheader: body, content: inner }),
      });
    } catch (e) {
      console.error('email send failed:', e);
    }
  }

  // Honor SMS opt-outs
  let optedOut = false;
  if (profile.phone) {
    const { data: optout } = await sb.from('sms_optouts').select('phone').eq('phone', profile.phone).maybeSingle();
    optedOut = !!optout;
  }

  if (
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER &&
    profile.phone &&
    smsEligible(type) &&
    allowSms &&
    !optedOut
  ) {
    try {
      const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
      await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: process.env.TWILIO_PHONE_NUMBER,
          To: profile.phone,
          Body: body,
        }),
      });
    } catch (e) {
      console.error('sms send failed:', e);
    }
  }
}

function smsEligible(type: NotificationType) {
  return ['wash_complete', 'wash_flagged', 'wash_reminder'].includes(type);
}

function prefRespects(type: NotificationType, prefs: Record<string, boolean>, channel: 'email' | 'sms') {
  // Operational/account messages always go through.
  const operational: NotificationType[] = ['payment_failed', 'pilot_signed', 'operator_assigned'];
  if (operational.includes(type)) return true;
  const map: Record<string, string> = {
    'wash_reminder:email': 'email_reminder',
    'wash_reminder:sms': 'sms_reminder',
    'wash_complete:email': 'email_complete',
    'wash_complete:sms': 'sms_complete',
    'wash_flagged:email': 'email_complete', // share the "completion alerts" toggle
    'wash_flagged:sms': 'sms_complete',
  };
  const key = map[`${type}:${channel}`];
  if (!key) return true;
  return prefs[key] !== false; // default-on
}

function renderBody(type: NotificationType, data: any) {
  switch (type) {
    case 'wash_complete':
      return `Your ${data.vehicleDesc ?? 'car'} is clean. Photo in your Lavo app.`;
    case 'wash_flagged':
      return `We couldn't complete your wash today. Reason: ${data.reason ?? 'unspecified'}. No charge applied.`;
    case 'wash_reminder':
      return `Reminder: Lavo washes ${data.buildingName ?? 'your building'} tomorrow.`;
    case 'payment_failed':
      return `We couldn't charge your card for the recent wash. Update your payment method to avoid skipping next time.`;
    case 'pilot_signed':
      return `New pilot signed: ${data.buildingName ?? 'building'}.`;
    case 'operator_assigned':
      return `Your building's car wash crew has been assigned: ${data.operatorName ?? 'an operator'}.`;
  }
}

function escapeHtml(s: string) {
  return esc(s);
}

function linkAbsolute(path: string) {
  if (path.startsWith('http')) return path;
  const base = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
