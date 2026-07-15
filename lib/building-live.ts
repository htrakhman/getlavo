import type { SupabaseClient } from '@supabase/supabase-js';

/** Same bar as homepage Branch A: partnership + packages or active partnership. */
export async function isBuildingBookable(sb: SupabaseClient, buildingId: string): Promise<boolean> {
  const { data: partnership } = await sb
    .from('partnerships')
    .select('id, status, operator:operators(id)')
    .eq('building_id', buildingId)
    .eq('status', 'active')
    .maybeSingle();

  if (!partnership) return false;

  const operator = (partnership.operator as { id?: string } | null) ?? null;
  if (!operator?.id) return partnership.status === 'active';

  const { count } = await sb
    .from('service_packages')
    .select('*', { count: 'exact', head: true })
    .eq('operator_id', operator.id)
    .eq('active', true);

  return (count ?? 0) > 0 || partnership.status === 'active';
}
