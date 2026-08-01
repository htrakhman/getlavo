import { NextResponse } from 'next/server';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendAdminNotification } from '@/lib/email/resend';
import { insuranceDocFile, insuranceDocViewUrl } from '@/lib/insurance-doc';
import { INSURANCE_REVIEW_HOLD_MINUTES } from '@/lib/insurance';

export async function PATCH(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = supabaseServer();
  const { data: op } = await sb
    .from('operators')
    .select('id, name, insurance_doc_url, insurance_uploaded_at, insurance_expires_at, insurance_review_status')
    .eq('owner_id', session.user.id)
    .maybeSingle();
  if (!op) return NextResponse.json({ error: 'operator not found' }, { status: 404 });

  const body = await req.json();
  const { carrier, expiresAt, docUrl, fileUploaded, policyNumber, coverageAmount } = body;

  const nextDocUrl = docUrl ?? op.insurance_doc_url;
  const hasCertificate = !!nextDocUrl;

  // A fresh upload always starts in `pending_review` — it verifies itself
  // INSURANCE_REVIEW_HOLD_MINUTES later (lib/insurance-auto-verify.ts), which
  // makes the window below an admin's chance to reject rather than a queue the
  // operator is waiting on. Metadata edits alone keep the status on file.
  let nextStatus = op.insurance_review_status;
  if (!hasCertificate) nextStatus = 'not_uploaded';
  else if (fileUploaded) nextStatus = 'pending_review';

  const coverageCents =
    typeof coverageAmount === 'number' && Number.isFinite(coverageAmount) && coverageAmount > 0
      ? Math.round(coverageAmount * 100)
      : null;

  const expiryChanged = !!expiresAt && expiresAt !== op.insurance_expires_at;

  const { error } = await supabaseAdmin()
    .from('operators')
    .update({
      insurance_carrier: carrier || null,
      insurance_policy_number: policyNumber || null,
      insurance_coverage_amount_cents: coverageCents,
      insurance_expires_at: expiresAt || null,
      insurance_doc_url: nextDocUrl,
      insurance_uploaded_at: fileUploaded ? new Date().toISOString() : op.insurance_uploaded_at,
      insurance_review_status: nextStatus,
      // A new certificate or a new expiry date re-arms the expiry reminder.
      ...(fileUploaded || expiryChanged ? { insurance_expiry_notified_at: null } : {}),
    })
    .eq('id', op.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (fileUploaded) {
    // The certificate rides along on the email so it can be read without
    // clicking through. Both the download and the signed link are
    // best-effort — a storage hiccup must not swallow the notification.
    const [file, viewUrl] = await Promise.all([
      insuranceDocFile(nextDocUrl).catch(() => null),
      insuranceDocViewUrl(nextDocUrl).catch(() => null),
    ]);

    await sendAdminNotification({
      subject: `Insurance certificate uploaded: ${op.name}`,
      lines: [
        `${op.name} uploaded a certificate of insurance. It verifies automatically in ${INSURANCE_REVIEW_HOLD_MINUTES} minutes unless you reject it first.`,
        carrier ? `Carrier: ${carrier}` : '',
        policyNumber ? `Policy #: ${policyNumber}` : '',
        coverageCents ? `Coverage: $${Math.round(coverageCents / 100).toLocaleString()}` : '',
        expiresAt ? `Expires: ${expiresAt}` : '',
        file
          ? `The certificate is attached to this email.`
          : viewUrl
            ? `Certificate (link valid for 1 hour): ${viewUrl}`
            : `No certificate file could be retrieved — check the operator's profile.`,
        `Open the review queue below if you want to look before it clears.`,
      ].filter(Boolean),
      action: { url: '/admin/insurance', label: 'Open the review queue →' },
      attachments: file
        ? [{ filename: `${op.name ?? 'operator'}-certificate-of-insurance-${file.filename}`.replace(/[^a-z0-9.\-]+/gi, '-'), content: file.bytes }]
        : undefined,
    }).catch((e) => {
      console.error('insurance review admin email failed:', e);
    });
  }

  return NextResponse.json({ success: true });
}
