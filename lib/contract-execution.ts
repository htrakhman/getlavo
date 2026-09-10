// What a fully executed service agreement turns on.
//
// Signing used to write to `contracts` and nothing else, but the rest of the
// product gates on `partnerships`: isBuildingBookable, /resident/book,
// /api/wash-days/propose and the resident portal all require an ACTIVE
// partnership row. An agreement signed by both parties therefore left the
// building on `prospect` with no partnership, so it could never take a
// booking — the deal closed on paper and delivered nothing.
//
// A fully executed agreement IS the partnership, so this runs the same
// activation the admin assign-operator route performs, and is the single
// place that decides what execution means.
import { supabaseAdmin } from '@/lib/supabase/admin';
import { onBuildingActivated } from '@/lib/building-activation';
import { logError } from '@/lib/error-log';

/**
 * Activate the partnership behind a newly executed contract.
 *
 * Safe to call more than once: an existing row for this building/operator pair
 * is promoted rather than duplicated, so a retry or a double-submit cannot
 * leave two partnerships on one building.
 *
 * Never throws. The signature is already committed by the time this runs, and
 * a failure here must not turn a successful signing into an error response —
 * it is logged for follow-up instead.
 */
export async function activatePartnershipForContract(contractId: string): Promise<void> {
  try {
    const admin = supabaseAdmin();

    const { data: contract } = await admin
      .from('contracts')
      .select('id, building_id, operator_id, status')
      .eq('id', contractId)
      .maybeSingle();
    if (!contract?.building_id || !contract.operator_id) return;
    if (contract.status !== 'executed') return;

    // partnerships.requested_by is NOT NULL. In this flow the operator is the
    // party who offered the agreement, so their owner is who asked for the
    // partnership. Without it the insert is rejected outright — and because
    // this function deliberately swallows its errors, that rejection would be
    // invisible: the contract would execute, the building would stay on
    // `prospect`, and the only trace would be a row in error_logs.
    const { data: operatorRow } = await admin
      .from('operators')
      .select('owner_id')
      .eq('id', contract.operator_id)
      .maybeSingle();
    if (!operatorRow?.owner_id) {
      throw new Error(`operator ${contract.operator_id} has no owner_id`);
    }

    const { building_id: buildingId, operator_id: operatorId } = contract;
    const now = new Date().toISOString();

    // Retire any active partnership with a DIFFERENT operator. One building
    // serves one operator, the same rule the admin assign route enforces.
    await admin
      .from('partnerships')
      .update({ status: 'inactive' })
      .eq('building_id', buildingId)
      .eq('status', 'active')
      .neq('operator_id', operatorId);

    // Promote this pair's existing row (a pending request that was later
    // settled by signing) rather than inserting a second one. A pair can carry
    // more than one historical row — a declined request followed by a fresh
    // one — so take the newest rather than maybeSingle(), which errors outright
    // when the filter matches several rows.
    const { data: existingRows } = await admin
      .from('partnerships')
      .select('id')
      .eq('building_id', buildingId)
      .eq('operator_id', operatorId)
      .order('created_at', { ascending: false })
      .limit(1);
    const existing = existingRows?.[0] ?? null;

    if (existing) {
      const { error } = await admin
        .from('partnerships')
        .update({ status: 'active', responded_at: now, connected_at: now })
        .eq('id', existing.id);
      if (error) throw new Error(`partnership update: ${error.message}`);
    } else {
      const { error } = await admin.from('partnerships').insert({
        building_id: buildingId,
        operator_id: operatorId,
        status: 'active',
        requested_by: operatorRow.owner_id,
        connected_at: now,
        responded_at: now,
      });
      if (error) throw new Error(`partnership insert: ${error.message}`);
    }

    // Only move a building that is still being courted. An operator change on
    // a paused or churned building must not silently reopen it.
    const { error: buildingError } = await admin
      .from('buildings')
      .update({ status: 'active' })
      .eq('id', buildingId)
      .in('status', ['lead', 'prospect', 'pilot']);
    if (buildingError) throw new Error(`building status: ${buildingError.message}`);

    await onBuildingActivated(buildingId).catch((e) =>
      console.error('contract execution: onBuildingActivated failed:', e),
    );
  } catch (e) {
    console.error('contract execution: activation failed:', e);
    void logError({
      source: 'contract.execution',
      message: e instanceof Error ? e.message : String(e),
      context: { contractId },
    });
  }
}
