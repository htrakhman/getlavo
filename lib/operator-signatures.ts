// Agreements waiting on the operator's own signature.
//
// The operator's Contracts page renders AgreementBuilder first — a full,
// live-updating copy of the service agreement — and only lists the actual
// contracts underneath it. So an operator with three agreements countersigned
// by the property and waiting on them opened the page, saw "Your agreement is
// ready to send ✓", and had to scroll past an entire legal document to find
// the rows that say "Needs your signature". Nothing in the nav marked it
// either: the operator sidebar only ever dotted Profile and Compliance.
//
// The result is the same failure the building portal had — a person is
// blocking a deal and the product never tells them. This is the one query
// both the dot and the page-top panel read, so they cannot disagree.
import { supabaseAdmin } from '@/lib/supabase/server';

export type AwaitingSignature = {
  contractId: string;
  buildingId: string | null;
  buildingName: string | null;
};

/**
 * Open agreements the property manager has signed and the operator has not,
 * oldest first. Both signature columns are checked, not just the operator's:
 * an offer nobody has touched is not "awaiting" the operator in any useful
 * sense, and treating it as one made a brand-new send look identical to a
 * countersigned agreement sitting on their desk.
 */
export async function getContractsAwaitingOperator(operatorId: string): Promise<AwaitingSignature[]> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from('contracts')
    .select('id, building_id, building:buildings(name)')
    .eq('operator_id', operatorId)
    .eq('status', 'pending_signatures')
    .is('operator_signed_at', null)
    .not('manager_signed_at', 'is', null)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('operator-signatures: query failed:', error.message);
    return [];
  }

  return (data ?? []).map((c: any) => ({
    contractId: c.id,
    buildingId: c.building_id ?? null,
    buildingName: c.building?.name ?? null,
  }));
}
