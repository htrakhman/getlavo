import type { SupabaseClient } from '@supabase/supabase-js';

export type BuildingWaitlistInsert = {
  building_candidate_key: string;
  building_id: string | null;
  email: string;
  full_name: string | null;
  profile_id: string | null;
  building_label: string;
  formatted_address: string | null;
  notify_email?: boolean;
  notify_sms?: boolean;
};

/** Insert waitlist row; falls back if building_label columns are not migrated yet. */
export async function insertBuildingWaitlistRow(
  sb: SupabaseClient,
  input: BuildingWaitlistInsert,
): Promise<{ ok: boolean; error?: string }> {
  const base = {
    building_candidate_key: input.building_candidate_key,
    building_id: input.building_id,
    email: input.email.trim().toLowerCase(),
    full_name: input.full_name,
    profile_id: input.profile_id,
    notify_email: input.notify_email ?? true,
    notify_sms: input.notify_sms ?? false,
  };

  const full = await sb.from('building_waitlist').insert({
    ...base,
    building_label: input.building_label,
    formatted_address: input.formatted_address,
  });

  if (!full.error) return { ok: true };

  const legacy = await sb.from('building_waitlist').insert(base);
  if (legacy.error) {
    console.error('building_waitlist insert', legacy.error, full.error);
    return { ok: false, error: legacy.error.message };
  }
  return { ok: true };
}
