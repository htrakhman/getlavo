// Helper for the multi-building manager experience.
// One manager can own multiple buildings; the active one is stored in a cookie.
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase/server';

const COOKIE = 'lavo_building_id';

export type ManagedBuilding = {
  id: string;
  name: string;
  slug: string | null;
};

/**
 * Loads all buildings the manager owns + the one currently selected.
 * If no cookie / cookie's stale, falls back to the first building (alphabetical).
 * Returns `null` if the user manages no buildings.
 */
export async function getCurrentBuildingForSession(profileId: string): Promise<{
  current: any | null;
  all: ManagedBuilding[];
}> {
  const sb = supabaseAdmin();
  const { data: all } = await sb
    .from('buildings')
    .select('id, name, slug')
    .eq('manager_id', profileId)
    .order('name', { ascending: true });

  if (!all || all.length === 0) return { current: null, all: [] };

  const cookieStore = cookies();
  const cookieId = cookieStore.get(COOKIE)?.value;
  const matchById = cookieId ? all.find((b) => b.id === cookieId) : null;
  const targetId = matchById?.id ?? all[0].id;

  const { data: current } = await sb.from('buildings').select('*').eq('id', targetId).maybeSingle();
  return { current, all: all as ManagedBuilding[] };
}

export const BUILDING_COOKIE = COOKIE;
