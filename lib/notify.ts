import { supabaseAdmin } from '@/lib/supabase/admin';
import { wrapEmail, paragraph, button, escape as esc } from '@/lib/email/template';
import { notificationCopies } from '@/lib/notification-emails';
import { CANCELLATION_CUTOFF_HOURS } from '@/lib/cancellation-policy';

type NotificationType =
  | 'booking_confirmed'
  | 'booking_received'
  | 'booking_rescheduled'
  | 'booking_cancelled'
  | 'refund_issued'
  | 'wash_complete'
  | 'wash_flagged'
  | 'wash_reminder'
  | 'payment_failed'
  | 'pilot_signed'
  | 'operator_assigned'
  | 'wash_day_proposed'
  | 'wash_day_confirmed'
  | 'wash_day_declined'
  | 'waitlist_building_live'
  | 'coi_expiring'
  | 'coi_expired'
  | 'coi_approved';

/**
 * `skipEmail` is for events that already sent a richer, purpose-built email
 * (booking confirmations carry a calendar invite and a price breakdown). The
 * in-app row and SMS still go out; the generic template would just arrive as a
 * duplicate.
 */
export async function notify(
  profileId: string,
  type: NotificationType,
  data: Record<string, any>,
  opts: { skipEmail?: boolean } = {},
) {
  const sb = supabaseAdmin();
  const { data: profile } = await sb
    .from('profiles')
    .select('email, phone, full_name, notification_emails')
    .eq('id', profileId)
    .maybeSingle();
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
    booking_confirmed: 'Your wash is booked',
    booking_received: 'New booking',
    booking_rescheduled: 'Wash moved to a new time',
    booking_cancelled: 'Wash cancelled',
    refund_issued: 'Refund on its way',
    wash_complete: 'Your car is done.',
    wash_flagged: "We couldn't complete your wash",
    wash_reminder: 'Your wash is tomorrow',
    payment_failed: 'Payment issue — update your card',
    pilot_signed: 'Pilot agreement signed',
    operator_assigned: 'Your car wash crew is set',
    wash_day_proposed: 'New wash day proposed — confirm the date',
    wash_day_confirmed: 'Wash day confirmed',
    wash_day_declined: 'Wash day declined',
    waitlist_building_live: 'Your building is live on Lavo',
    coi_expiring: 'Your insurance expires soon',
    coi_expired: 'Your insurance on file has expired',
    coi_approved: 'Your certificate of insurance is verified',
  };

  const body = renderBody(type, data);

  await sb.from('notifications').insert({
    recipient_id: profileId,
    kind: type,
    title: titles[type],
    body,
    link: data.link ?? null,
  });

  if (process.env.RESEND_API_KEY && profile.email && allowEmail && !opts.skipEmail) {
    try {
      const { sendWithCopies } = await import('@/lib/email/resend');
      const greetName = profile.full_name?.split(' ')[0] ?? '';
      const link = data.link ?? null;
      const inner = [
        paragraph(greetName ? `Hi ${greetName},` : 'Hello,'),
        paragraph(body),
        link ? button(linkAbsolute(link), data.cta ?? 'View in app') : '',
      ].join('');
      // The extras the account added get their own copy of this notification,
      // sent separately so a primary address the provider refuses can't take
      // the copies with it.
      await sendWithCopies(
        {
          from: process.env.RESEND_FROM_EMAIL || 'Lavo <hello@getlavo.io>',
          to: profile.email,
          subject: titles[type],
          html: wrapEmail({ preheader: body, content: inner }),
        },
        notificationCopies(profile),
      );
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
  return ['wash_complete', 'wash_flagged', 'wash_reminder', 'waitlist_building_live'].includes(type);
}

function prefRespects(type: NotificationType, prefs: Record<string, boolean>, channel: 'email' | 'sms') {
  // Operational/account messages always go through.
  const operational: NotificationType[] = ['booking_confirmed', 'booking_received', 'booking_rescheduled', 'booking_cancelled', 'refund_issued', 'payment_failed', 'pilot_signed', 'operator_assigned', 'wash_day_proposed', 'wash_day_confirmed', 'wash_day_declined', 'waitlist_building_live', 'coi_expiring', 'coi_expired', 'coi_approved'];
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
    case 'booking_confirmed':
      return `Your wash at ${data.buildingName || 'your building'} is confirmed for ${when(data)}. Leave your keys at the front desk beforehand.`;
    case 'booking_received':
      return `${data.residentName || 'A resident'} at ${data.buildingName || 'your building'} booked a wash for ${when(data)}.`;
    case 'booking_rescheduled':
      return `${data.residentName ? `${data.residentName}'s` : 'Your'} wash at ${data.buildingName || 'your building'} moved from ${data.previousScheduledFor ?? 'its earlier slot'}${data.previousTimeSlot ? ` at ${data.previousTimeSlot}` : ''} to ${when(data)}.`;
    case 'booking_cancelled':
      return `${data.residentName ? `${data.residentName}'s` : 'Your'} wash at ${data.buildingName || 'your building'} on ${when(data)} was cancelled.${
        data.refunded ? ' A refund is on its way to the original payment method.' : ''
      }${
        data.refundWithheld
          ? ` Cancelled within ${CANCELLATION_CUTOFF_HOURS} hours of the wash, so it isn't refunded.`
          : ''
      }`;
    case 'refund_issued':
      return `We've refunded ${data.amount ?? 'your payment'} for your cancelled wash${
        data.buildingName ? ` at ${data.buildingName}` : ''
      }. Refunds take 5–10 business days to appear on your statement.`;
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
    case 'wash_day_proposed':
      return `${data.operatorName ?? 'Your operator'} proposed ${data.date ?? 'a new wash day'} for ${data.buildingName ?? 'your building'}. Review and confirm the date.`;
    case 'wash_day_confirmed':
      return `${data.buildingName ?? 'The building'} confirmed your proposed wash day${data.date ? ` for ${data.date}` : ''}.`;
    case 'wash_day_declined':
      return `${data.buildingName ?? 'The building'} declined your proposed wash day${data.date ? ` for ${data.date}` : ''}. Propose another date.`;
    case 'waitlist_building_live':
      return `${data.buildingName ?? 'Your building'} is live on Lavo. Use code ${data.code ?? ''} for your free first wash.`;
    case 'coi_expiring':
      return `Your certificate of insurance expires ${data.expiresAt ?? 'soon'}. Upload a renewed certificate to stay verified.`;
    case 'coi_expired':
      return `Your certificate of insurance expired${data.expiresAt ? ` on ${data.expiresAt}` : ''}. Upload a current certificate to get verified again.`;
    case 'coi_approved':
      return `Your certificate of insurance is verified${data.expiresAt ? ` through ${data.expiresAt}` : ''}. Buildings now see the verified badge on your profile.`;
    default:
      return 'Update from Lavo.';
  }
}

function when(data: any) {
  return data.timeSlot ? `${data.scheduledFor} at ${data.timeSlot}` : (data.scheduledFor ?? 'the scheduled date');
}

function escapeHtml(s: string) {
  return esc(s);
}

function linkAbsolute(path: string) {
  if (path.startsWith('http')) return path;
  const base = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
