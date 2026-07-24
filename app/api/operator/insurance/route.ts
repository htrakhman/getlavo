import { NextResponse } from 'next/server';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendAdminNotification } from '@/lib/email/resend';

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

  // A certificate never self-approves. A fresh upload goes to the admin
  // review queue; metadata edits alone keep whatever status is on file.
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
    await sendAdminNotification({
      subject: `Insurance certificate awaiting review: ${op.name}`,
      lines: [
        `${op.name} uploaded a certificate of insurance and it's awaiting your review.`,
        carrier ? `Carrier: ${carrier}` : '',
        policyNumber ? `Policy #: ${policyNumber}` : '',
        coverageCents ? `Coverage: $${Math.round(coverageCents / 100).toLocaleString()}` : '',
        expiresAt ? `Expires: ${expiresAt}` : '',
        `Open the review queue below to approve or reject it.`,
      ].filter(Boolean),
      action: { url: '/admin/insurance', label: 'Review — approve or reject →' },
    }).catch((e) => {
      console.error('insurance review admin email failed:', e);
    });
  }

  return NextResponse.json({ success: true });
}
