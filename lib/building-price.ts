import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * The standard wash price for one building.
 *
 * `operators.base_price_cents` is not a price anyone chose: PackagesEditor
 * auto-sets it to min(active package prices), so quoting it as "standard wash"
 * shows the resident the cheapest package's price under a different name. The
 * rate that actually belongs to a building is the one the operator agreed for
 * it, so prefer, in order:
 *
 *  1. `partnerships.standard_wash_price_cents` — set by the operator per building.
 *  2. `contracts.price_per_wash_cents` — the rate captured when the agreement
 *     was sent, for partnerships predating (1).
 *  3. null — caller falls back to the operator's global rate.
 */
export async function getBuildingWashPriceCents(
  admin: SupabaseClient,
  buildingId: string | null | undefined,
  operatorId: string | null | undefined,
): Promise<number | null> {
  if (!buildingId || !operatorId) return null;

  const { data: partnership } = await admin
    .from('partnerships')
    .select('standard_wash_price_cents')
    .eq('building_id', buildingId)
    .eq('operator_id', operatorId)
    .eq('status', 'active')
    .maybeSingle();

  const agreed = partnership?.standard_wash_price_cents;
  if (typeof agreed === 'number' && agreed > 0) return agreed;

  // Contracts have had schema drift (see migration 0048) — a missing column
  // must not take booking down, so fall through to the operator rate instead.
  try {
    const { data: contract, error } = await admin
      .from('contracts')
      .select('price_per_wash_cents')
      .eq('building_id', buildingId)
      .eq('operator_id', operatorId)
      .not('price_per_wash_cents', 'is', null)
      .not('status', 'in', '(cancelled,expired,draft)')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return null;
    const priced = contract?.price_per_wash_cents;
    return typeof priced === 'number' && priced > 0 ? priced : null;
  } catch {
    return null;
  }
}

/**
 * What a wash costs before add-ons and promos. A chosen package wins; then the
 * building's agreed rate; then the operator's global rates.
 */
export function resolveWashPriceCents(opts: {
  packagePriceCents?: number | null;
  buildingPriceCents?: number | null;
  bookingType: 'building_day' | 'open_slot';
  basePriceCents: number;
  openSlotPriceCents?: number | null;
}): number {
  if (opts.packagePriceCents && opts.packagePriceCents > 0) return opts.packagePriceCents;
  if (opts.bookingType === 'building_day') {
    return opts.buildingPriceCents && opts.buildingPriceCents > 0
      ? opts.buildingPriceCents
      : opts.basePriceCents;
  }
  return opts.openSlotPriceCents ?? opts.buildingPriceCents ?? opts.basePriceCents;
}
