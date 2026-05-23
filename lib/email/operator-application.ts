import { escape, paragraph, wrapEmail } from '@/lib/email/template';

const DEFAULT_FROM = 'Harold <harold@getlavo.io>';
const DEFAULT_TO = 'harold@getlavo.io';

export type OperatorApplicationPayload = {
  name: string;
  company: string;
  email: string;
  phone?: string | null;
  serviceArea: string;
  insured: boolean;
  notes?: string | null;
  source?: string | null;
  citySlug?: string | null;
  submittedAt: string;
};

function fromAddress() {
  return process.env.OPERATOR_APPLICATION_FROM_EMAIL || DEFAULT_FROM;
}

function toAddress() {
  return process.env.OPERATOR_APPLICATION_TO_EMAIL || DEFAULT_TO;
}

async function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  const { Resend } = await import('resend');
  return new Resend(process.env.RESEND_API_KEY);
}

function field(label: string, value?: string | null) {
  const text = (value ?? '').trim() || 'Not provided';
  return `<tr><td style="padding:8px 12px 8px 0;color:#888;vertical-align:top;white-space:nowrap;">${escape(label)}</td><td style="padding:8px 0;color:#e5e5e5;">${escape(text)}</td></tr>`;
}

export async function sendOperatorApplicationEmail(
  payload: OperatorApplicationPayload,
): Promise<boolean> {
  const resend = await getResend();
  if (!resend) {
    console.warn('RESEND_API_KEY missing; skipping operator application email');
    return false;
  }

  const subject = `Operator application: ${payload.company}`;
  const html = wrapEmail({
    preheader: subject,
    content: [
      paragraph('New operator application submitted.'),
      `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;width:100%;">${[
        field('Name', payload.name),
        field('Company', payload.company),
        field('Email', payload.email),
        field('Phone', payload.phone),
        field('Service area', payload.serviceArea),
        field('Licensed & insured', payload.insured ? 'Yes' : 'No'),
        field('Notes', payload.notes),
        field('Source', payload.source),
        field('City page', payload.citySlug),
        field('Submitted at', payload.submittedAt),
      ].join('')}</table>`,
      `<p style="margin:16px 0 0 0;"><a href="mailto:${escape(payload.email)}" style="color:#00e5c8;text-decoration:none;">Reply to applicant</a></p>`,
    ].join(''),
  });

  try {
    const { error } = await resend.emails.send({
      from: fromAddress(),
      to: toAddress(),
      replyTo: payload.email,
      subject,
      html,
    });
    if (error) {
      console.error('sendOperatorApplicationEmail', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('sendOperatorApplicationEmail', e);
    return false;
  }
}
