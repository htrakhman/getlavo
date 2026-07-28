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
    .select('id, resident_id, wash_day_id, vehicle:vehicles(make, model, year)')
    .eq('id', params.id)
    .maybeSingle();

  // The resident opted out of this wash day. Completing anyway would charge
  // them for a wash they declined, so refuse regardless of what the roster UI
  // showed the crew — the skip is the resident's decision, not a display hint.
  if (wash?.resident_id && wash?.wash_day_id) {
    const { data: skip } = await admin
      .from('wash_skips')
      .select('resident_id')
      .eq('wash_day_id', wash.wash_day_id)
      .eq('resident_id', wash.resident_id)
      .maybeSingle();
    if (skip) {
      return NextResponse.json(
        { error: 'This resident skipped this wash day — nothing to complete.' },
        { status: 409 },
      );
    }
  }

  await admin.from('washes').update({
    status: 'completed',
    completed_at: new Date().toISOString(),
  }).eq('id', params.id);

  // Best-effort Stripe charge — failure is recorded in the charges ledger but
  // does not roll back completion.
  const charge = await chargeWash(admin, params.id).catch(
    (e): { ok: false; status: number; error: string } => ({ ok: false, status: 500, error: e?.message ?? 'charge error' })
  );

  const v = wash?.vehicle as any;
  if (check.ctx.residentProfileId) {
    await notify(check.ctx.residentProfileId, 'wash_complete', {
      vehicleDesc: v ? `${v.year} ${v.make} ${v.model}` : 'car',
      link: '/resident/washes',
    });
    if (!charge.ok && charge.error === 'no payment method on file') {
      await notify(check.ctx.residentProfileId, 'payment_failed', { link: '/resident/payment' });
    }
  }

  // Report the payment outcome alongside completion — the wash is done either
  // way, but "done" and "paid" are separate facts and the caller shouldn't
  // have to assume the second from the first.
  return NextResponse.json({
    success: true,
    charge: charge.ok ? { status: 'succeeded' } : { status: 'failed', error: charge.error },
  });
}
