import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { applyPromoToBooking } from '@/lib/promo';
import { z } from 'zod';

const Body = z.object({
  code: z.string().max(64),
  operatorId: z.string().uuid(),
  bookingType: z.enum(['building_day', 'open_slot']).default('open_slot'),
});

/**
 * Price a promo code before checkout.
 *
 * The booking form used to accept any string without feedback: a real code and
 * a typo looked identical, and the total on screen stayed at full price right
 * up to the Stripe redirect (QA, July 2026). This runs the same validation the
 * booking route runs at submission — same eligibility rules, same arithmetic —
 * so the quoted total is the total that gets charged.
 *
 * Read-only: nothing is redeemed here. Redemption still happens once payment
 * confirms.
 */
export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session || !session.portals.includes('resident')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const { code, operatorId, bookingType } = body.data;

  const admin = supabaseAdmin();

  const { data: resident } = await admin
    .from('residents')
    .select('id')
    .eq('profile_id', session.user.id)
    .single();
  if (!resident) return NextResponse.json({ error: 'Resident record not found' }, { status: 404 });

  const { data: operator } = await admin
    .from('operators')
    .select('base_price_cents, open_slot_price_cents')
    .eq('id', operatorId)
    .eq('status', 'approved')
    .single();
  if (!operator) return NextResponse.json({ error: 'Operator not available' }, { status: 404 });

  const baseGrossCents =
    bookingType === 'building_day'
      ? operator.base_price_cents
      : (operator.open_slot_price_cents ?? operator.base_price_cents);

  const result = await applyPromoToBooking(admin, {
    rawCode: code,
    profileId: session.user.id,
    residentId: resident.id,
    baseGrossCents,
  });

  if (!result.ok) {
    // A rejected code is a normal answer here, not a request failure — the
    // form shows the reason inline while the resident keeps typing.
    return NextResponse.json({ valid: false, reason: result.error });
  }

  return NextResponse.json({
    valid: !!result.promo,
    code: result.promo?.code ?? null,
    discountCents: result.discountCents,
    washCents: result.finalGrossCents,
  });
}
