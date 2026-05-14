import { NextResponse } from 'next/server';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = supabaseServer();
  const { data: op } = await sb.from('operators').select('id').eq('owner_id', session.user.id).maybeSingle();
  if (!op) return NextResponse.json({ error: 'no operator' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const admin = supabaseAdmin();
  const { error } = await admin
    .from('operators')
    .update({
      coi_insurer_name: body.insurerName ?? null,
      coi_policy_number: body.policyNumber ?? null,
      coi_coverage_limits: body.coverageLimits ?? null,
      coi_expires_at: body.expiresAt ?? null,
      coi_additional_insured_ok: !!body.additionalInsuredOk,
      coi_file_url: body.fileUrl ?? null,
    })
    .eq('id', op.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
