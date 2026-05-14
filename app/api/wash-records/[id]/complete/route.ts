import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { notify } from '@/lib/notify';
import { loadWashForOperator } from '@/lib/auth/wash-ownership';
import { chargeWash } from '@/lib/stripe/charge-wash';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const admin = supabaseAdmin();
  const check = await loadWashForOperator(admin, params.id, session.user.id);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const { data: wash } = await admin
    .from('washes')
    .select('id, vehicle:vehicles(make, model, year)')
    .eq('id', params.id)
    .maybeSingle();

  await admin.from('washes').update({
    status: 'completed',
    completed_at: new Date().toISOString(),
  }).eq('id', params.id);

  // Best-effort Stripe charge — failure logs to Stripe but does not roll back completion.
  await chargeWash(admin, params.id).catch(() => {});

  const v = wash?.vehicle as any;
  if (check.ctx.residentProfileId) {
    await notify(check.ctx.residentProfileId, 'wash_complete', {
      vehicleDesc: v ? `${v.year} ${v.make} ${v.model}` : 'car',
      link: '/resident/washes',
    });
  }

  return NextResponse.json({ success: true });
}
