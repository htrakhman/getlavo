import { NextResponse } from 'next/server';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { audit } from '@/lib/audit';
import { notify } from '@/lib/notify';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const sb = supabaseServer();
  const { data: profile } = await sb.from('profiles').select('role').eq('id', session.user.id).maybeSingle();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { decision, note } = await req.json();
  if (!['approved', 'rejected'].includes(decision)) return NextResponse.json({ error: 'bad decision' }, { status: 400 });

  const admin = supabaseAdmin();
  await admin.from('operators').update({
    insurance_review_status: decision,
    insurance_reviewed_at: new Date().toISOString(),
    insurance_reviewed_by: session.user.id,
    insurance_review_note: note ?? null,
  }).eq('id', params.id);

  const { data: op } = await admin.from('operators').select('owner_id, name').eq('id', params.id).maybeSingle();
  if (op?.owner_id) {
    await notify(op.owner_id, 'operator_assigned', {
      operatorName: op.name,
      buildingName: decision === 'approved' ? 'Insurance approved' : `Insurance rejected: ${note ?? ''}`,
    });
  }

  await audit({
    actorId: session.user.id,
    actorRole: 'admin',
    action: `admin.insurance.${decision}`,
    entityType: 'operator',
    entityId: params.id,
    metadata: note ? { note } : undefined,
  });

  return NextResponse.json({ success: true });
}
