import { supabaseAdmin } from '@/lib/supabase/admin';
import type { NjMunicipality } from './nj-municipalities';

export type CityBuildingRef = {
  name: string;
  slug: string | null;
  status: string;
};

export type CityOperatorRef = {
  name: string;
  slug: string;
};

export type CityLiveData = {
  buildings: CityBuildingRef[];
  operators: CityOperatorRef[];
  pricingRangeCents: { min: number; max: number } | null;
};

function canQuerySupabase(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

/** Buildings and operators tied to a municipality name (server/build time). */
export async function fetchCityLiveData(muni: NjMunicipality): Promise<CityLiveData | null> {
  if (!canQuerySupabase()) return null;

  try {
    const admin = supabaseAdmin();
    const { data: buildings } = await admin
      .from('buildings')
      .select('id, name, slug, status, city')
      .ilike('city', muni.name)
      .in('status', ['prospect', 'pilot', 'active'])
      .order('name')
      .limit(12);

    const buildingRows = buildings ?? [];
    const buildingIds = buildingRows.map((b) => b.id);

    let operators: CityOperatorRef[] = [];
    if (buildingIds.length > 0) {
      const { data: partnerships } = await admin
        .from('partnerships')
        .select('operator:operators(id, name, slug, status, live_ok)')
        .in('building_id', buildingIds)
        .in('status', ['active', 'pilot']);

      const seen = new Set<string>();
      for (const row of partnerships ?? []) {
        const raw = row.operator as
          | {
              id: string;
              name: string;
              slug: string;
              status?: string;
              live_ok?: boolean;
            }
          | {
              id: string;
              name: string;
              slug: string;
              status?: string;
              live_ok?: boolean;
            }[]
          | null;
        const op = Array.isArray(raw) ? raw[0] : raw;
        if (!op?.slug || seen.has(op.id)) continue;
        if (op.status === 'suspended' || op.status === 'rejected') continue;
        seen.add(op.id);
        operators.push({ name: op.name, slug: op.slug });
      }
      operators.sort((a, b) => a.name.localeCompare(b.name));
    }

    let pricingRangeCents: { min: number; max: number } | null = null;
    if (operators.length > 0) {
      const slugs = operators.map((o) => o.slug);
      const { data: priceRows } = await admin
        .from('operators')
        .select('base_price_cents')
        .in('slug', slugs)
        .eq('live_ok', true)
        .not('base_price_cents', 'is', null);
      const prices = (priceRows ?? []).map((r) => r.base_price_cents as number);
      if (prices.length) {
        pricingRangeCents = { min: Math.min(...prices), max: Math.max(...prices) };
      }
    }

    return {
      buildings: buildingRows.map((b) => ({
        name: b.name,
        slug: b.slug ?? null,
        status: b.status,
      })),
      operators,
      pricingRangeCents,
    };
  } catch {
    return null;
  }
}
