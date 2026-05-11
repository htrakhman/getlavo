import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { notify } from '@/lib/notify';
import { audit } from '@/lib/audit';

export async function POST(req: Request) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { buildingId, operatorId } = await req.json();
  const admin = supabaseAdmin();

  // Deactivate any existing active partnership
  await admin.from('partnerships').update({ status: 'inactive' })
    .eq('building_id', buildingId).eq('status', 'active');

  const { data: partnership, error } = await admin.from('partnerships').insert({
    building_id: buildingId,
    operator_id: operatorId,
    status: 'active',
    requested_by: user.id,
    connected_at: new Date().toISOString(),
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify operator owner
  const { data: op } = await admin.from('operators').select('owner_id, name').eq('id', operatorId).maybeSingle();
  const { data: building } = await admin.from('buildings').select('name').eq('id', buildingId).maybeSingle();
  if (op?.owner_id) {
    await notify(op.owner_id, 'operator_assigned', { buildingName: building?.name, operatorName: op.name });
  }

  await audit({
    actorId: user.id,
    actorRole: 'admin',
    action: 'admin.assign_operator',
    entityType: 'partnership',
    entityId: partnership.id,
    metadata: { buildingId, operatorId, buildingName: building?.name, operatorName: op?.name },
  });

  return NextResponse.json({ assignmentId: partnership.id });
}
