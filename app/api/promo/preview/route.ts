import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { applyPromoToBooking } from '@/lib/promo';
import { getBuildingWashPriceCents, resolveWashPriceCents } from '@/lib/building-price';
import { z } from 'zod';

const Body = z.object({
  code: z.string().max(64),
  operatorId: z.string().uuid(),
  bookingType: z.enum(['building_day', 'open_slot']).default('open_slot'),
  packageId: z.string().uuid().optional(),
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
  const { code, operatorId, bookingType, packageId } = body.data;

  const admin = supabaseAdmin();

  const { data: resident } = await admin
    .from('residents')
    .select('id, building_id')
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

  // Same price resolution the booking route uses, so the quoted discount is
  // priced against the wash the resident actually configured.
  const [{ data: pkg }, buildingPriceCents] = await Promise.all([
    packageId
      ? admin
          .from('service_packages')
          .select('price_cents')
          .eq('id', packageId)
          .eq('operator_id', operatorId)
          .eq('active', true)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    getBuildingWashPriceCents(admin, resident.building_id, operatorId),
  ]);

  const baseGrossCents = resolveWashPriceCents({
    packagePriceCents: pkg?.price_cents,
    buildingPriceCents,
    bookingType,
    basePriceCents: operator.base_price_cents,
    openSlotPriceCents: operator.open_slot_price_cents,
  });

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
