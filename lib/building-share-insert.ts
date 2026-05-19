import type { SupabaseClient } from '@supabase/supabase-js';
import { randomShareToken } from '@/lib/building-candidate';

type ShareLinkInput = {
  building_candidate_key: string;
  building_id: string | null;
  created_by_request_id?: string | null;
};

/** Creates or reuses a neighbor share token; tolerates missing optional columns. */
export async function createBuildingShareToken(
  sb: SupabaseClient,
  input: ShareLinkInput,
): Promise<string | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const token = randomShareToken(10);
    const payloads: Record<string, unknown>[] = [
      {
        token,
        building_candidate_key: input.building_candidate_key,
        building_id: input.building_id,
        created_by_request_id: input.created_by_request_id ?? null,
      },
      {
        token,
        building_candidate_key: input.building_candidate_key,
        building_id: input.building_id,
      },
    ];

    for (const payload of payloads) {
      const { data, error } = await sb
        .from('building_share_links')
        .insert(payload)
        .select('token')
        .single();

      if (!error && data?.token) return data.token;

      const code = (error as { code?: string })?.code;
      if (code === '23505') break; // token collision — retry outer loop
      if (code === '42P01') {
        console.error('building_share_links table missing — run funnel migration in Supabase');
        return null;
      }
    }
  }

  const { data: existing } = await sb
    .from('building_share_links')
    .select('token')
    .eq('building_candidate_key', input.building_candidate_key)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return existing?.token ?? null;
}
