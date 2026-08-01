import type { SupabaseClient } from '@supabase/supabase-js';

export type BookingType = 'building_day' | 'open_slot';

/** The two flat rates carried on an operator's own row. */
export type OperatorFlatRates = {
  base_price_cents?: number | null;
  open_slot_price_cents?: number | null;
};

export type StandardWashPricing = {
  /** A wash on the building's wash day, no package selected. */
  buildingDayCents: number;
  /** A wash outside the building day. Null when the operator publishes no separate on-demand rate. */
  openSlotCents: number | null;
  /** True when the figure came from the building's signed agreement rather than the operator's profile. */
  fromContract: boolean;
};

/**
 * What a resident pays for the "Standard wash" — the operator's regular wash,
 * with no package selected.
 *
 * The rate the operator agreed to *with the building* wins. The operator types
 * a base price per wash into the agreement they send, and the signed contract
 * keeps it as `price_per_wash_cents`; that is the number the building signed, so
 * it outranks whatever the operator's profile happens to say later. Nothing on
 * the operator's service menu may move it: a $1 test package or a cheap add-on
 * tier is a menu item, not a renegotiation, and letting the cheapest package
 * define the base price repriced every partnered building at once (QA, Aug 2026
 * — a $1.00 package dropped the standard wash to $1.00 across eleven buildings).
 *
 * With no executed contract there is nothing building-specific to honour, so the
 * operator's profile base price stands.
 *
 * Display and charge both resolve through here, so the price on the booking form
 * is the price on the receipt.
 */
export async function standardWashPricing(
  db: SupabaseClient<any, any, any>,
  {
    buildingId,
    operatorId,
    operator,
  }: { buildingId: string; operatorId: string; operator: OperatorFlatRates },
): Promise<StandardWashPricing> {
  return resolveStandardWashPricing(operator, await contractedWashCents(db, buildingId, operatorId));
}

/**
 * The price per wash on the building's executed agreement with this operator,
 * or null when there isn't one.
 *
 * Only an executed contract counts — a draft or one still out for signature is
 * a proposal, not a rate either side is held to. Contracts predating migration
 * 0048 can carry a null price, and those fall through to the profile rate.
 */
export async function contractedWashCents(
  db: SupabaseClient<any, any, any>,
  buildingId: string,
  operatorId: string,
): Promise<number | null> {
  const { data } = await db
    .from('contracts')
    .select('price_per_wash_cents')
    .eq('building_id', buildingId)
    .eq('operator_id', operatorId)
    .eq('status', 'executed')
    .not('price_per_wash_cents', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const cents = data?.price_per_wash_cents;
  return typeof cents === 'number' && cents > 0 ? cents : null;
}

/** The pure half of {@link standardWashPricing}, split out so it can be tested without a database. */
export function resolveStandardWashPricing(
  operator: OperatorFlatRates,
  contractedCents: number | null,
): StandardWashPricing {
  const profileBase = operator.base_price_cents ?? 0;
  const fromContract = contractedCents != null && contractedCents > 0;
  return {
    buildingDayCents: fromContract ? (contractedCents as number) : profileBase,
    openSlotCents: operator.open_slot_price_cents ?? null,
    fromContract,
  };
}

/**
 * The single rate a booking rings up at. An operator without a separate
 * on-demand rate charges their building-day price either way.
 */
export function washCentsFor(pricing: StandardWashPricing, bookingType: BookingType): number {
  return bookingType === 'building_day' ? pricing.buildingDayCents : (pricing.openSlotCents ?? pricing.buildingDayCents);
}
