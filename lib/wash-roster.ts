import type { SupabaseClient } from '@supabase/supabase-js';
import { syncWashDayAddonOrders } from '@/lib/addons';

/**
 * Roster generation: materialize washes rows for a wash day from the
 * building's residents who have chosen a service package.
 *
 * Residents without a package are invisible to operators on wash day by
 * design — the package is what the operator charges against — so package
 * selection (lib + /api/residents/package) is the other half of this flow.
 *
 * Safe to call repeatedly: (wash_day_id, resident_id) is unique and
 * conflicts are ignored, so residents already on the roster are skipped.
 */
export async function syncWashDayRoster(admin: SupabaseClient, washDayId: string): Promise<number> {
  const { data: wd } = await admin
    .from('wash_days')
    .select('id, building_id, confirmation, completed_at')
    .eq('id', washDayId)
    .maybeSingle();
  if (!wd || wd.completed_at || wd.confirmation === 'declined') return 0;

  const { data: residents, error: resErr } = await admin
    .from('residents')
    .select('id, spot_label, vehicles(id, is_primary)')
    .eq('building_id', wd.building_id)
    .not('package_id', 'is', null);
  if (resErr) {
    console.error('syncWashDayRoster: residents query failed:', resErr.message);
    return 0;
  }

  const { data: existing } = await admin
    .from('washes')
    .select('resident_id')
    .eq('wash_day_id', washDayId);
  const have = new Set((existing ?? []).map((r: any) => r.resident_id as string));

  // Standing add-ons ride along with the roster so the crew sees them on the
  // day. Runs for every rostered wash, not just the new ones, since a resident
  // can pick an add-on after they're already on the list.
  const syncAddons = () => syncWashDayAddonOrders(admin, washDayId);

  const rows = (residents ?? [])
    .filter((r: any) => !have.has(r.id))
    .map((r: any) => {
      const vehicles = (r.vehicles as any[]) ?? [];
      const vehicle = vehicles.find((v) => v.is_primary) ?? vehicles[0];
      if (!vehicle) return null;
      return {
        wash_day_id: washDayId,
        resident_id: r.id,
        vehicle_id: vehicle.id,
        spot_label: r.spot_label ?? null,
      };
    })
    .filter(Boolean) as Record<string, unknown>[];
  if (!rows.length) {
    await syncAddons();
    return 0;
  }

  const { error } = await admin
    .from('washes')
    .upsert(rows, { onConflict: 'wash_day_id,resident_id', ignoreDuplicates: true });
  if (error) {
    console.error('syncWashDayRoster: insert failed:', error.message);
    return 0;
  }
  await syncAddons();
  return rows.length;
}

/**
 * Add a building's packaged residents to every upcoming wash day.
 * Called when a resident picks a package (they join days already on the
 * calendar) and when new wash days are created.
 */
export async function syncUpcomingRostersForBuilding(admin: SupabaseClient, buildingId: string): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const { data: days } = await admin
    .from('wash_days')
    .select('id')
    .eq('building_id', buildingId)
    .gte('scheduled_for', today)
    .neq('confirmation', 'declined')
    .is('completed_at', null);
  for (const d of days ?? []) {
    await syncWashDayRoster(admin, d.id);
  }
}
