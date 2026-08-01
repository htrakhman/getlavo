import { NextResponse } from 'next/server';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendAdminNotification } from '@/lib/email/resend';
import { insuranceDocFile, insuranceDocViewUrl } from '@/lib/insurance-doc';

/**
 * Emails a certificate of insurance to the admin inbox on demand, with the
 * form itself attached — so a certificate can be pulled up for approval from
 * the archive, not only when it is first uploaded.
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const sb = supabaseServer();
  const { data: profile } = await sb.from('profiles').select('role').eq('id', session.user.id).maybeSingle();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { data: op } = await supabaseAdmin()
    .from('operators')
    .select('id, name, insurance_carrier, insurance_policy_number, insurance_coverage_amount_cents, insurance_expires_at, insurance_doc_url, insurance_uploaded_at, insurance_review_status')
    .eq('id', params.id)
    .maybeSingle();
  if (!op) return NextResponse.json({ error: 'operator not found' }, { status: 404 });
  if (!op.insurance_doc_url) return NextResponse.json({ error: 'no certificate on file' }, { status: 400 });

  const [file, viewUrl] = await Promise.all([
    insuranceDocFile(op.insurance_doc_url).catch(() => null),
    insuranceDocViewUrl(op.insurance_doc_url).catch(() => null),
  ]);

  await sendAdminNotification({
    subject: `Certificate of insurance: ${op.name}`,
    lines: [
      `Certificate of insurance for ${op.name}.`,
      op.insurance_carrier ? `Carrier: ${op.insurance_carrier}` : '',
      op.insurance_policy_number ? `Policy #: ${op.insurance_policy_number}` : '',
      op.insurance_coverage_amount_cents
        ? `Coverage: $${Math.round(op.insurance_coverage_amount_cents / 100).toLocaleString()}`
        : '',
      op.insurance_expires_at ? `Expires: ${op.insurance_expires_at}` : '',
      op.insurance_uploaded_at ? `Uploaded: ${op.insurance_uploaded_at.slice(0, 10)}` : '',
      `Current status: ${String(op.insurance_review_status ?? 'unknown').replace('_', ' ')}`,
      file
        ? `The certificate is attached to this email.`
        : viewUrl
          ? `Certificate (link valid for 1 hour): ${viewUrl}`
          : `The certificate file could not be retrieved from storage.`,
    ].filter(Boolean),
    action: { url: '/admin/insurance', label: 'Approve or reject →' },
    attachments: file
      ? [{
          filename: `${op.name ?? 'operator'}-certificate-of-insurance-${file.filename}`.replace(/[^a-z0-9.\-]+/gi, '-'),
          content: file.bytes,
        }]
      : undefined,
  });

  return NextResponse.json({ success: true, attached: !!file });
}
