import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { audit } from '@/lib/audit';
import { notify } from '@/lib/notify';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { status, rejectionReason } = await req.json();
  const admin = supabaseAdmin();
  await admin.from('operators').update({ status }).eq('id', params.id);

  // Cascade notifications when an active operator gets suspended/rejected
  if (status === 'suspended' || status === 'rejected') {
    const { data: op } = await admin.from('operators').select('name, owner_id').eq('id', params.id).maybeSingle();
    const { data: parts } = await admin
      .from('partnerships')
      .select('building_id, building:buildings(name, manager_id)')
      .eq('operator_id', params.id)
      .eq('status', 'active');

    // Notify the operator's owner first
    if (op?.owner_id) {
      await notify(op.owner_id, 'operator_assigned', {
        operatorName: op.name,
        buildingName: status === 'suspended' ? 'Account suspended' : 'Application closed',
      });
    }

    // Notify each affected building manager + their residents
    for (const p of parts ?? []) {
      const managerId = (p.building as any)?.manager_id;
      const buildingName = (p.building as any)?.name;
      if (managerId) {
        await notify(managerId, 'operator_assigned', {
          operatorName: op?.name,
          buildingName: `Operator suspended at ${buildingName}`,
          link: '/building/marketplace',
        });
      }
      const { data: residents } = await admin
        .from('residents')
        .select('profile_id')
        .eq('building_id', p.building_id)
        .eq('is_subscribed', true);
      for (const r of residents ?? []) {
        await notify(r.profile_id, 'wash_flagged', {
          reason: 'Your operator is temporarily unavailable. We\'re working on it.',
        });
      }

      // Deactivate the partnership so the marketplace flips back to "finding your crew"
      await admin.from('partnerships').update({ status: 'inactive' }).eq('building_id', p.building_id).eq('operator_id', params.id);
    }
  }

  await audit({
    actorId: user.id,
    actorRole: 'admin',
    action: `admin.operator_status.${status}`,
    entityType: 'operator',
    entityId: params.id,
    metadata: rejectionReason ? { rejectionReason } : undefined,
  });

  return NextResponse.json({ success: true });
}
