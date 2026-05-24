import { wrapEmail, paragraph } from '@/lib/email/template';
import { userBuildingLabel } from '@/lib/email/building-request';

async function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  const { Resend } = await import('resend');
  return new Resend(process.env.RESEND_API_KEY);
}

function fromAddress() {
  return process.env.RESEND_FROM_EMAIL || 'Lavo <hello@getlavo.io>';
}

export type WaitlistJoinConfirmationPayload = {
  to: string;
  firstName?: string | null;
  buildingLabel: string;
  formattedAddress?: string | null;
  /** Building already exists in Lavo (pending operator match). */
  onPlatform?: boolean;
};

/** Immediate confirmation after joining a building waitlist. */
export async function sendWaitlistJoinConfirmationEmail(
  payload: WaitlistJoinConfirmationPayload,
): Promise<boolean> {
  const resend = await getResend();
  if (!resend) {
    console.warn('RESEND_API_KEY missing; skipping waitlist confirmation email');
    return false;
  }

  const building = userBuildingLabel(payload.buildingLabel, payload.formattedAddress);
  const greeting = payload.firstName?.trim()
    ? `Hi ${payload.firstName.trim().split(' ')[0]},`
    : 'Hi there,';

  const subject = `You're on the list for ${building}`;
  const preheader = payload.onPlatform
    ? `We'll email you when ${building} is matched with a car wash operator.`
    : `We'll email you when Lavo launches at ${building}.`;

  const inner = payload.onPlatform
    ? [
        paragraph(greeting),
        paragraph(
          `You're on the waitlist for ${building}. We have this building on Lavo and are working on matching a vetted car wash operator.`,
        ),
        paragraph(
          'You do not need to do anything else. When booking opens, we will send you a second email with a link to create your account and claim your first wash.',
        ),
        paragraph('Thanks for your patience — we will be in touch soon.'),
      ].join('')
    : [
        paragraph(greeting),
        paragraph(`Thanks for requesting Lavo at ${building}.`),
        paragraph(
          'We are tracking demand and working to bring mobile car wash booking to your building. When Lavo is ready there, you will get another email with next steps.',
        ),
        paragraph('Thanks for helping us bring Lavo to your neighbors.'),
      ].join('');

  try {
    await resend.emails.send({
      from: fromAddress(),
      to: payload.to,
      subject,
      html: wrapEmail({ preheader, content: inner }),
    });
    return true;
  } catch (e) {
    console.error('sendWaitlistJoinConfirmationEmail', e);
    return false;
  }
}
