import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { syncRequestedDatesToWashDays } from '@/lib/building-requested-dates';
import { parseDateList } from '@/lib/wash-dates';
import { sendBuildingDatesScheduled } from '@/lib/email/resend';
import { z } from 'zod';

const Body = z.object({
  buildingId: z.string().uuid(),
  dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(30),
});

/** Property manager sets the specific dates they want wash service on. */
export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session || !session.portals.includes('building')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = Body.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const { buildingId } = body.data;
  const dates = parseDateList(body.data.dates);

  const admin = supabaseAdmin();
  const { data: building } = await admin
    .from('buildings')
    .select('id, name, manager_id')
    .eq('id', buildingId)
    .maybeSingle();
  if (!building || building.manager_id !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await admin
    .from('buildings')
    .update({ requested_wash_dates: dates })
    .eq('id', buildingId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // With an active partner, chosen dates land on their calendar immediately.
  const scheduled = await syncRequestedDatesToWashDays(buildingId).catch((e) => {
    console.error('requested-dates: sync failed:', e);
    return [] as string[];
  });

  if (scheduled.length) {
    const { data: partnership } = await admin
      .from('partnerships')
      .select('operator:operators(name, owner_id)')
      .eq('building_id', buildingId)
      .eq('status', 'active')
      .maybeSingle();
    const operator = (partnership?.operator as any) ?? null;
    if (operator?.owner_id) {
      const { data: owner } = await admin
        .from('profiles')
        .select('email, full_name')
        .eq('id', operator.owner_id)
        .single();
      if (owner?.email) {
        await sendBuildingDatesScheduled({
          to: owner.email,
          operatorName: owner.full_name ?? operator.name,
          buildingName: building.name,
          dates: scheduled,
        }).catch(() => {});
      }
    }
  }

  return NextResponse.json({ ok: true, scheduled });
}
