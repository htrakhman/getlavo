// Cross-building view of agreements waiting on the manager's signature.
//
// A manager can own many buildings, but the portal only ever renders the one
// selected in the cookie (lib/building.ts). Anything scoped to that single
// building — the sidebar red dot, the contract page — goes silent about the
// rest, so a manager with three offers signs the one they land on and never
// learns the other two exist. Every "needs your signature" surface reads from
// here instead, so they all count the same buildings.
import { supabaseAdmin } from '@/lib/supabase/server';

export type PendingAgreement = {
  contractId: string;
  buildingId: string;
  buildingName: string;
  operatorName: string | null;
  createdAt: string | null;
};

/**
 * Every agreement across all of this manager's buildings that is open and
 * still missing their signature, oldest first (the one that has been waiting
 * longest is the most urgent). An operator signature is irrelevant here —
 * either side may sign first, so a contract needs the manager whether or not
 * the operator has already signed.
 */
export async function getPendingAgreementsForManager(profileId: string): Promise<PendingAgreement[]> {
  const sb = supabaseAdmin();

  const { data: buildings } = await sb
    .from('buildings')
    .select('id, name')
    .eq('manager_id', profileId);
  if (!buildings?.length) return [];

  const nameById = new Map(buildings.map((b: any) => [b.id, b.name as string]));

  const { data: contracts, error } = await sb
    .from('contracts')
    .select('id, building_id, created_at, operator:operators(name)')
    .in('building_id', Array.from(nameById.keys()))
    .eq('status', 'pending_signatures')
    .is('manager_signed_at', null)
    .order('created_at', { ascending: true });
  if (error) {
    console.error('pending-agreements: query failed:', error.message);
    return [];
  }

  return (contracts ?? []).map((c: any) => ({
    contractId: c.id,
    buildingId: c.building_id,
    buildingName: nameById.get(c.building_id) ?? 'Your building',
    operatorName: (Array.isArray(c.operator) ? c.operator[0]?.name : c.operator?.name) ?? null,
    createdAt: c.created_at ?? null,
  }));
}
