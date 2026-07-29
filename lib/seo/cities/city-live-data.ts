import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  PUBLIC_BUILDING_STATUSES,
  PUBLIC_OPERATOR_STATUSES,
  filterPublicEntities,
  isPubliclyListable,
} from '@/lib/seo/public-data';
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

/**
 * Buildings and operators tied to a municipality name (server/build time).
 *
 * Every row is passed through the public-data guard before it leaves this
 * function: QA fixtures share the production database and carry real statuses,
 * so they would otherwise surface in city page copy and LocalBusiness JSON-LD.
 */
export async function fetchCityLiveData(muni: NjMunicipality): Promise<CityLiveData | null> {
  if (!canQuerySupabase()) return null;

  try {
    const admin = supabaseAdmin();
    const { data: buildings } = await admin
      .from('buildings')
      .select('id, name, slug, status, city, is_seed')
      .ilike('city', muni.name)
      .in('status', [...PUBLIC_BUILDING_STATUSES])
      .order('name')
      .limit(24);

    const buildingRows = filterPublicEntities(buildings ?? []).slice(0, 12);
    const buildingIds = buildingRows.map((b) => b.id);

    let operators: CityOperatorRef[] = [];
    if (buildingIds.length > 0) {
      const { data: partnerships } = await admin
        .from('partnerships')
        .select('operator:operators(id, name, slug, status, live_ok, is_seed)')
        .in('building_id', buildingIds)
        .eq('status', 'active');

      const seen = new Set<string>();
      for (const row of partnerships ?? []) {
        const raw = row.operator as
          | {
              id: string;
              name: string;
              slug: string;
              status?: string;
              live_ok?: boolean;
              is_seed?: boolean;
            }
          | {
              id: string;
              name: string;
              slug: string;
              status?: string;
              live_ok?: boolean;
              is_seed?: boolean;
            }[]
          | null;
        const op = Array.isArray(raw) ? raw[0] : raw;
        if (!op?.slug || seen.has(op.id)) continue;
        // City copy calls these "approved operators", so anything still in
        // review, suspended, or rejected stays off the page.
        if (!PUBLIC_OPERATOR_STATUSES.includes(op.status as 'approved')) continue;
        if (op.live_ok === false) continue;
        if (!isPubliclyListable(op)) continue;
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
      // Placeholder prices (0 or a few cents) would render as "from $0".
      const prices = (priceRows ?? [])
        .map((r) => r.base_price_cents as number)
        .filter((cents) => Number.isFinite(cents) && cents > 0);
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
