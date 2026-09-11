/**
 * The billing arrangement in force for a building, read from its agreement.
 *
 * The arrangement lives on the contract because that is what the two parties
 * signed — not on the building, where it could drift from the document, and
 * not on the operator, who does not get to decide who pays.
 *
 * Falls back to occupant_pays whenever there is no executed agreement to read.
 * That is the safe direction: the worst case is charging the occupant as the
 * product always has, rather than silently billing a property that never
 * agreed to pay or handing out a free wash nobody is charged for.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  normalizeBillingMode,
  DEFAULT_BILLING_MODE,
  type BillingMode,
} from '@/lib/billing-arrangement';

export type BuildingBilling = {
  mode: BillingMode;
  subsidyCents: number;
  /** The property's saved card, when one is on file. */
  paymentMethodId: string | null;
  stripeCustomerId: string | null;
};

export const OCCUPANT_PAYS_FALLBACK: BuildingBilling = {
  mode: DEFAULT_BILLING_MODE,
  subsidyCents: 0,
  paymentMethodId: null,
  stripeCustomerId: null,
};

export async function getBuildingBilling(
  admin: SupabaseClient,
  buildingId: string | null | undefined,
): Promise<BuildingBilling> {
  if (!buildingId) return OCCUPANT_PAYS_FALLBACK;

  // The executed agreement is the one in force. A contract still awaiting a
  // signature has not been agreed by both parties, so its billing terms are
  // not yet binding on anyone.
  const { data: contract } = await admin
    .from('contracts')
    .select('billing_mode, property_subsidy_cents')
    .eq('building_id', buildingId)
    .eq('status', 'executed')
    .order('fully_executed_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  const { data: building } = await admin
    .from('buildings')
    .select('stripe_customer_id, stripe_payment_method_id')
    .eq('id', buildingId)
    .maybeSingle();

  return {
    mode: normalizeBillingMode(contract?.billing_mode),
    subsidyCents: Math.max(0, contract?.property_subsidy_cents ?? 0),
    paymentMethodId: building?.stripe_payment_method_id ?? null,
    stripeCustomerId: building?.stripe_customer_id ?? null,
  };
}
