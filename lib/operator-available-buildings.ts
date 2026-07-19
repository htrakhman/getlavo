import { supabaseAdmin } from '@/lib/supabase/admin';
import { withinRadius } from '@/lib/geo';

export type AvailableBuilding = {
  id: string;
  name: string;
  address_line1: string | null;
  city: string | null;
  region: string | null;
  total_units: number | null;
  status: string;
  lat: number | null;
  lng: number | null;
  preferred_wash_day: string | null;
  requested_wash_dates: unknown;
};

export type OperatorPendingRequest = {
  buildingId: string;
  partnershipId: string;
};

/** Buildings with no active or pending partnership (open for matchmaking). */
export async function getAvailableBuildingsForOperator(operatorId: string): Promise<{
  available: AvailableBuilding[];
  pendingByBuildingId: Map<string, string>;
}> {
  const admin = supabaseAdmin();

  const [{ data: operator }, { data: buildings }, { data: partnerships }] = await Promise.all([
    admin.from('operators').select('id, lat, lng, service_radius_miles').eq('id', operatorId).single(),
    admin
      .from('buildings')
      .select('id, name, address_line1, city, region, total_units, status, lat, lng, preferred_wash_day, requested_wash_dates')
      .in('status', ['prospect', 'pilot', 'active'])
      .order('name'),
    admin.from('partnerships').select('id, building_id, operator_id, status').in('status', ['active', 'pending']),
  ]);

  const takenBuildingIds = new Set((partnerships ?? []).map((p) => p.building_id));
  const pendingByBuildingId = new Map<string, string>();
  for (const p of partnerships ?? []) {
    if (p.status === 'pending' && p.operator_id === operatorId) {
      pendingByBuildingId.set(p.building_id, p.id);
    }
  }

  let available = (buildings ?? []).filter((b) => !takenBuildingIds.has(b.id));

  if (operator?.lat != null && operator?.lng != null && operator.service_radius_miles) {
    available = available.filter((b) => {
      if (b.lat == null || b.lng == null) return true;
      return withinRadius(b.lat, b.lng, operator.lat!, operator.lng!, operator.service_radius_miles!);
    });
  }

  return { available, pendingByBuildingId };
}
