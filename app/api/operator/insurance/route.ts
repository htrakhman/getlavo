import { NextResponse } from 'next/server';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function PATCH(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = supabaseServer();
  const { data: op } = await sb
    .from('operators')
    .select('id, insurance_doc_url, insurance_uploaded_at, insurance_review_status')
    .eq('owner_id', session.user.id)
    .maybeSingle();
  if (!op) return NextResponse.json({ error: 'operator not found' }, { status: 404 });

  const body = await req.json();
  const { carrier, expiresAt, docUrl, fileUploaded } = body;

  const hasProof = !!docUrl || (!!carrier && !!expiresAt);

  const { error } = await supabaseAdmin()
    .from('operators')
    .update({
      insurance_carrier: carrier || null,
      insurance_expires_at: expiresAt || null,
      insurance_doc_url: docUrl ?? op.insurance_doc_url,
      insurance_uploaded_at: fileUploaded ? new Date().toISOString() : op.insurance_uploaded_at,
      insurance_review_status: hasProof ? 'approved' : op.insurance_review_status,
    })
    .eq('id', op.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
