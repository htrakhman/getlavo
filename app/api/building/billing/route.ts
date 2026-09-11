import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getCurrentBuildingForSession } from '@/lib/building';
import { BILLING_MODES, normalizeBillingMode } from '@/lib/billing-arrangement';

const Body = z.object({
  // Saving a card and choosing an arrangement are separate actions on the
  // same panel, so both are optional and either can be sent alone.
  paymentMethodId: z.string().min(1).optional(),
  billingMode: z.enum(BILLING_MODES).optional(),
  subsidyCents: z.number().int().min(0).max(100_000).optional(),
});

/**
 * Set the property's card and/or the billing arrangement for its agreement.
 *
 * The arrangement is written to the executed contract, because that is the
 * document both parties signed. Changing who pays is a change to the
 * agreement, not a preference.
 */
export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session || !session.portals.includes('building')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const { paymentMethodId, billingMode, subsidyCents } = parsed.data;

  const admin = supabaseAdmin();
  const { current } = await getCurrentBuildingForSession(session.user.id);
  if (!current) return NextResponse.json({ error: 'No building selected.' }, { status: 404 });

  if (paymentMethodId) {
    await admin
      .from('buildings')
      .update({ stripe_payment_method_id: paymentMethodId })
      .eq('id', current.id);
  }

  if (billingMode) {
    const mode = normalizeBillingMode(billingMode);
    // A card on file is what makes a property-funded arrangement collectable.
    // Without one the wash would be performed with nobody charged, so the
    // arrangement cannot be switched on at all.
    if (mode !== 'occupant_pays') {
      const { data: building } = await admin
        .from('buildings')
        .select('stripe_payment_method_id')
        .eq('id', current.id)
        .maybeSingle();
      const card = paymentMethodId ?? building?.stripe_payment_method_id;
      if (!card) {
        return NextResponse.json(
          { error: 'Save a card for the property before it can pay for washes.' },
          { status: 400 },
        );
      }
    }

    // A subsidy only exists in the subsidized arrangement; the database
    // constraint enforces this too, so send a shape it will accept.
    const subsidy = mode === 'property_subsidized' ? subsidyCents ?? 0 : 0;
    if (mode === 'property_subsidized' && subsidy <= 0) {
      return NextResponse.json(
        { error: 'Enter how much of each wash the property covers.' },
        { status: 400 },
      );
    }

    const { data: contract } = await admin
      .from('contracts')
      .select('id')
      .eq('building_id', current.id)
      .eq('status', 'executed')
      .order('fully_executed_at', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    if (!contract) {
      return NextResponse.json(
        { error: 'This building has no executed agreement yet, so there is nothing to bill against.' },
        { status: 400 },
      );
    }

    const { error } = await admin
      .from('contracts')
      .update({ billing_mode: mode, property_subsidy_cents: subsidy })
      .eq('id', contract.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
