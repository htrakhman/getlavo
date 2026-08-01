import type { SupabaseClient } from '@supabase/supabase-js';

export type ServicePackage = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  est_minutes: number | null;
  size_prices: { size: string; price_cents: number }[];
};

export type BuildingPackages = {
  operatorId: string | null;
  operatorName: string | null;
  packages: ServicePackage[];
};

/** Active, published service packages an operator sells — the wash "types" a resident picks between. */
export async function getPackagesForOperator(admin: SupabaseClient, operatorId: string): Promise<ServicePackage[]> {
  const { data, error } = await admin
    .from('service_packages')
    .select('id, name, description, price_cents, est_minutes, size_prices')
    .eq('operator_id', operatorId)
    .eq('active', true)
    .order('display_order', { ascending: true })
    .order('price_cents', { ascending: true });
  if (error) {
    console.error('getPackagesForOperator: query failed:', error.message);
    return [];
  }
  return (data ?? []) as ServicePackage[];
}

/**
 * The service packages a resident of this building can choose from: the
 * active packages of the building's active partner operator. Empty until
 * the building is matched with an operator.
 */
export async function getPackagesForBuilding(admin: SupabaseClient, buildingId: string): Promise<BuildingPackages> {
  const { data: partnership } = await admin
    .from('partnerships')
    .select('operator_id, operator:operators(id, name)')
    .eq('building_id', buildingId)
    .eq('status', 'active')
    .maybeSingle();
  const operator = (partnership?.operator as any) ?? null;
  if (!operator) return { operatorId: null, operatorName: null, packages: [] };

  const packages = await getPackagesForOperator(admin, operator.id);

  return {
    operatorId: operator.id,
    operatorName: operator.name,
    packages,
  };
}
