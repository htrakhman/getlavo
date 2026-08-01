import type { SupabaseClient } from '@supabase/supabase-js';

export type BookingType = 'building_day' | 'open_slot';

/** The two flat rates carried on an operator's own row. */
export type OperatorFlatRates = {
  base_price_cents?: number | null;
  open_slot_price_cents?: number | null;
};

export type StandardWashPricing = {
  /** A wash on the building's wash day, no package selected. 0 when the operator has set no rate. */
  buildingDayCents: number;
  /** A wash outside the building day. Null when the operator publishes no separate on-demand rate. */
  openSlotCents: number | null;
  /** True when the figure came from the building's signed agreement rather than the operator's profile. */
  fromContract: boolean;
  /**
   * True when there is a real standard wash to sell. An operator who has never
   * set a rate has no standard wash — the booking form offers their packages
   * only, rather than quoting $0.00 or whatever a stray menu item implies.
   */
  available: boolean;
};

/**
 * What a resident pays for the "Standard wash" — the operator's regular wash on
 * a building wash day, with no package selected.
 *
 * The operator establishes this rate themselves, on their profile ("Standard
 * wash", mirrored by the base price per wash in the agreement builder). It is
 * the one number that says what their regular wash costs, and it is deliberately
 * not derived from anything else. Nothing on the service menu may move it: a $1
 * test package or a cheap add-on tier is a menu item, not the standard wash, and
 * letting the cheapest package define the base price repriced every partnered
 * building at once (QA, Aug 2026 — a $1.00 "Test Detail" package dropped the
 * standard wash to $1.00 on the screen residents book from, for an operator
 * whose real menu starts at $70).
 *
 * A building that signed an agreement gets the rate on that agreement. The
 * operator types the base price into the agreement they send, and the executed
 * contract keeps it as `price_per_wash_cents`; that is the number the building
 * signed, so a later profile edit doesn't silently reprice a signed building.
 * With no executed contract there is nothing building-specific to honour, so the
 * operator's profile rate stands.
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

/** A price only counts when it's a real, positive figure — 0 and null both mean "not set". */
function rate(cents: number | null | undefined): number | null {
  return typeof cents === 'number' && Number.isFinite(cents) && cents > 0 ? cents : null;
}

/** The pure half of {@link standardWashPricing}, split out so it can be tested without a database. */
export function resolveStandardWashPricing(
  operator: OperatorFlatRates,
  contractedCents: number | null,
): StandardWashPricing {
  const contracted = rate(contractedCents);
  const buildingDayCents = contracted ?? rate(operator.base_price_cents) ?? 0;
  return {
    buildingDayCents,
    openSlotCents: rate(operator.open_slot_price_cents),
    fromContract: contracted != null,
    // No building-day rate means no standard wash, whatever else is on the row:
    // an on-demand price alone would leave the wash-day booking at $0.00.
    available: buildingDayCents > 0,
  };
}

/**
 * The single rate a booking rings up at. An operator without a separate
 * on-demand rate charges their building-day price either way. Callers must check
 * `available` first — this returns 0 for an operator with no standard wash, and
 * a $0 wash is a bug, not a freebie.
 */
export function washCentsFor(pricing: StandardWashPricing, bookingType: BookingType): number {
  return bookingType === 'building_day' ? pricing.buildingDayCents : (pricing.openSlotCents ?? pricing.buildingDayCents);
}
