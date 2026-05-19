import type { SupabaseClient } from '@supabase/supabase-js';

export type BuildingRequestInsertInput = {
  building_candidate_key: string;
  building_id: string | null;
  source: 'organic' | 'ad' | 'referral';
  place_id: string | null;
  formatted_address: string | null;
  building_display_name: string;
  resident_name: string | null;
  resident_email: string;
  mgmt_email: string | null;
  mgmt_contact_name: string | null;
  notes: string | null;
  profile_id: string | null;
  channel: 'neighbor_share' | 'building_request';
};

function legacyChannel(channel: BuildingRequestInsertInput['channel']) {
  return channel === 'neighbor_share' ? 'neighbor_share' : 'waitlist_join';
}

function overflowJson(mgmtContactName: string | null, notes: string | null) {
  const extra: Record<string, string> = {};
  if (mgmtContactName) extra.mgmtContactName = mgmtContactName;
  if (notes) extra.notes = notes;
  return Object.keys(extra).length > 0 ? extra : null;
}

/** Inserts building_requests; falls back when migration 0024 is not applied yet. */
export async function insertBuildingRequestRow(
  sb: SupabaseClient,
  input: BuildingRequestInsertInput,
): Promise<{ id: string } | null> {
  const base = {
    building_candidate_key: input.building_candidate_key,
    building_id: input.building_id,
    source: input.source,
    place_id: input.place_id,
    formatted_address: input.formatted_address,
    building_display_name: input.building_display_name,
    resident_name: input.resident_name,
    resident_email: input.resident_email,
    mgmt_email: input.mgmt_email,
    profile_id: input.profile_id,
  };

  const full = await sb
    .from('building_requests')
    .insert({
      ...base,
      channel: input.channel,
      mgmt_contact_name: input.mgmt_contact_name,
      notes: input.notes,
    })
    .select('id')
    .single();

  if (!full.error && full.data) return full.data;

  const overflow = overflowJson(input.mgmt_contact_name, input.notes);
  const legacy = await sb
    .from('building_requests')
    .insert({
      ...base,
      channel: legacyChannel(input.channel),
      vehicle_json: overflow,
    })
    .select('id')
    .single();

  if (legacy.error) {
    console.error('building_requests insert (legacy fallback)', legacy.error, full.error);
    return null;
  }
  return legacy.data;
}
