import { wrapEmail, paragraph, escape } from '@/lib/email/template';

const DEFAULT_FROM = 'Harold <harold@getlavo.io>';
const DEFAULT_OPS = ['harold@getlavo.io', 'haroldtrakhman@gmail.com'];

export type BuildingRequestEmailPayload = {
  residentEmail: string;
  residentFirstName?: string | null;
  buildingLabel?: string | null;
  formattedAddress?: string | null;
  mgmtContactName?: string | null;
  mgmtEmail?: string | null;
  notes?: string | null;
  source?: string | null;
  submittedAt: string;
  shareUrl: string;
};

function fromAddress() {
  return process.env.BUILDING_REQUEST_FROM_EMAIL || DEFAULT_FROM;
}

function opsRecipients(): string[] {
  const raw = process.env.BUILDING_REQUEST_OPS_EMAILS;
  if (raw?.trim()) {
    return raw.split(',').map((e) => e.trim()).filter((e) => e.includes('@'));
  }
  return DEFAULT_OPS;
}

/** User-facing building label; never empty placeholder in UI copy. */
export function userBuildingLabel(label?: string | null, formattedAddress?: string | null): string {
  const t = (label ?? '').trim() || (formattedAddress ?? '').trim();
  return t || 'your building';
}

/** Internal email fallbacks. */
function internalField(value?: string | null, fallback = 'Not provided') {
  const t = (value ?? '').trim();
  return t || fallback;
}

function internalBuildingLabel(label?: string | null, formattedAddress?: string | null) {
  const t = (label ?? '').trim() || (formattedAddress ?? '').trim();
  return t || 'Unknown building';
}

async function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  const { Resend } = await import('resend');
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendInternalBuildingRequestEmail(
  payload: BuildingRequestEmailPayload,
): Promise<boolean> {
  const resend = await getResend();
  if (!resend) {
    console.warn('RESEND_API_KEY missing; skipping internal building request email');
    return false;
  }

  const building = internalBuildingLabel(payload.buildingLabel, payload.formattedAddress);
  const subject = `New Lavo building request: ${building}`;
  const body = [
    'New resident request submitted.',
    '',
    `Resident email: ${internalField(payload.residentEmail)}`,
    `Resident first name: ${internalField(payload.residentFirstName)}`,
    `Building: ${internalBuildingLabel(payload.buildingLabel, payload.formattedAddress)}`,
    `Building contact name: ${internalField(payload.mgmtContactName)}`,
    `Building contact email: ${internalField(payload.mgmtEmail)}`,
    `Notes: ${internalField(payload.notes)}`,
    `Source: ${internalField(payload.source)}`,
    `Submitted at: ${payload.submittedAt}`,
    `Share link: ${payload.shareUrl}`,
  ].join('\n');

  const html = wrapEmail({
    preheader: subject,
    content: `<pre style="margin:0;font-family:inherit;font-size:15px;line-height:1.6;white-space:pre-wrap;color:#e5e5e5;">${escape(body)}</pre>`,
  });

  try {
    await resend.emails.send({
      from: fromAddress(),
      to: opsRecipients(),
      subject,
      html,
    });
    return true;
  } catch (e) {
    console.error('sendInternalBuildingRequestEmail', e);
    return false;
  }
}

export async function sendBuildingContactOutreachEmail(payload: {
  mgmtEmail: string;
  mgmtContactName?: string | null;
  buildingLabel?: string | null;
  formattedAddress?: string | null;
}): Promise<boolean> {
  const mgmtEmail = payload.mgmtEmail.trim();
  if (!mgmtEmail.includes('@')) return false;

  const resend = await getResend();
  if (!resend) {
    console.warn('RESEND_API_KEY missing; skipping building contact outreach email');
    return false;
  }

  const building = userBuildingLabel(payload.buildingLabel, payload.formattedAddress);
  const contactName = (payload.mgmtContactName ?? '').trim();
  const greeting = contactName ? `Hi ${contactName},` : 'Hey there,';

  const subject = `Resident request for Lavo at ${building}`;
  const inner = [
    paragraph(greeting),
    paragraph(
      `A resident at ${building} asked us to reach out about bringing Lavo to the building.`,
    ),
    paragraph(
      'Lavo lets apartment residents book mobile car washes directly from their phone. Buildings pay nothing, residents book and pay themselves, and operators are vetted and insured.',
    ),
    paragraph(
      'For the property team, it is meant to be simple. You share a building link or QR code, residents book, and Lavo handles the operator side, scheduling, payments, and resident communication.',
    ),
    paragraph('Here is the info:'),
    '<p style="margin:0 0 16px 0;"><a href="https://www.getlavo.io/" style="color:#00e5c8;text-decoration:none;">https://www.getlavo.io/</a></p>',
    paragraph('Would you be open to taking a look?'),
    '<p style="margin:16px 0 4px 0;">Best,</p>',
    '<p style="margin:0 0 4px 0;">Harold</p>',
    '<p style="margin:0 0 16px 0;">Lavo</p>',
  ].join('');

  try {
    await resend.emails.send({
      from: fromAddress(),
      to: mgmtEmail,
      replyTo: 'harold@getlavo.io',
      subject,
      html: wrapEmail({
        preheader: `Resident request for Lavo at ${building}`,
        content: inner,
      }),
    });
    return true;
  } catch (e) {
    console.error('sendBuildingContactOutreachEmail', e);
    return false;
  }
}

/** Escape for plain-text contexts if needed elsewhere. */
export { escape };
