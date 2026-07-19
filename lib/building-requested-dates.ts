import { supabaseAdmin } from '@/lib/supabase/admin';
import { parseDateList, futureDates } from '@/lib/wash-dates';

/**
 * Materialize the building's requested wash dates onto its active partner's
 * calendar as confirmed wash_days rows. Confirmed wash_days take top priority
 * in lib/availability.ts, so the building's chosen dates override whatever
 * general availability the operator has set.
 *
 * Safe to call repeatedly: dates that already have a wash_day row are skipped.
 * Returns the newly scheduled dates (empty when there is no active partner).
 */
export async function syncRequestedDatesToWashDays(buildingId: string): Promise<string[]> {
  const admin = supabaseAdmin();

  const [{ data: building }, { data: partnership }] = await Promise.all([
    admin
      .from('buildings')
      .select('id, manager_id, requested_wash_dates')
      .eq('id', buildingId)
      .maybeSingle(),
    admin
      .from('partnerships')
      .select('id, operator_id')
      .eq('building_id', buildingId)
      .eq('status', 'active')
      .maybeSingle(),
  ]);
  if (!building || !partnership) return [];

  const dates = futureDates(parseDateList(building.requested_wash_dates));
  if (!dates.length) return [];

  const { data: existing } = await admin
    .from('wash_days')
    .select('scheduled_for')
    .eq('building_id', buildingId)
    .in('scheduled_for', dates);
  const have = new Set((existing ?? []).map((r: any) => r.scheduled_for as string));

  const fresh = dates.filter((d) => !have.has(d));
  if (!fresh.length) return [];

  const { error } = await admin.from('wash_days').insert(
    fresh.map((d) => ({
      building_id: buildingId,
      partnership_id: partnership.id,
      operator_id: partnership.operator_id,
      scheduled_for: d,
      proposed_for: d,
      proposed_by: building.manager_id,
      confirmation: 'confirmed',
    })),
  );
  if (error) {
    console.error('syncRequestedDatesToWashDays: insert failed:', error.message);
    return [];
  }
  return fresh;
}
