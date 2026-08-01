import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { z } from 'zod';

const Body = z.object({
  // Null clears the building rate and falls the resident price back to the
  // operator's global rate.
  priceCents: z.number().int().min(100).max(1_000_00).nullable(),
});

/**
 * Set the standard wash price this operator charges at one building. Only the
 * operator who owns the partnership can change it.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionUser();
  if (!session || !session.portals.includes('operator')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: 'Invalid price' }, { status: 400 });

  const admin = supabaseAdmin();

  const { data: operator } = await admin
    .from('operators')
    .select('id')
    .eq('owner_id', session.user.id)
    .maybeSingle();
  if (!operator) return NextResponse.json({ error: 'Operator not found' }, { status: 404 });

  const { data: partnership } = await admin
    .from('partnerships')
    .select('id, operator_id')
    .eq('id', params.id)
    .maybeSingle();
  if (!partnership || partnership.operator_id !== operator.id) {
    return NextResponse.json({ error: 'Partnership not found' }, { status: 404 });
  }

  const { error } = await admin
    .from('partnerships')
    .update({ standard_wash_price_cents: body.data.priceCents })
    .eq('id', params.id);
  if (error) {
    console.error('[partnerships/price] update failed', { partnershipId: params.id, message: error.message });
    return NextResponse.json({ error: 'Could not save the price' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, priceCents: body.data.priceCents });
}
