import type { SupabaseClient } from '@supabase/supabase-js';
import { buildingCandidateKey } from '@/lib/building-candidate';

export type BuildingForMatch = {
  id: string;
  name: string;
  slug: string | null;
  google_place_id: string | null;
  address_line1: string | null;
  city: string | null;
  region: string | null;
};

export type WaitlistRow = {
  id: string;
  email: string | null;
  phone: string | null;
  profile_id: string | null;
  full_name: string | null;
};

/** Candidate keys used to tie pre-launch requests to a buildings row. */
export function candidateKeysForBuilding(building: BuildingForMatch): string[] {
  const keys = new Set<string>();
  const pid = building.google_place_id?.trim();
  if (pid) keys.add(`place:${pid}`);

  const parts = [building.address_line1, building.city, building.region].filter(Boolean) as string[];
  const combos = [
    building.address_line1,
    parts.join(', '),
    building.name,
  ].filter((s): s is string => typeof s === 'string' && s.trim().length > 3);

  for (const line of combos) {
    keys.add(buildingCandidateKey(null, line.trim()));
  }

  return [...keys];
}

/** Link orphan waitlist rows to this building before notify. */
export async function backfillWaitlistBuildingId(
  sb: SupabaseClient,
  building: BuildingForMatch,
): Promise<void> {
  const keys = candidateKeysForBuilding(building);
  if (keys.length === 0) return;

  await sb
    .from('building_waitlist')
    .update({ building_id: building.id })
    .in('building_candidate_key', keys)
    .is('building_id', null);

  const { data: requests } = await sb
    .from('building_requests')
    .select('resident_email, building_candidate_key')
    .in('building_candidate_key', keys)
    .not('resident_email', 'is', null);

  const emails = [
    ...new Set(
      (requests ?? [])
        .map((r) => (typeof r.resident_email === 'string' ? r.resident_email.trim().toLowerCase() : ''))
        .filter((e) => e.includes('@')),
    ),
  ];

  if (emails.length > 0) {
    await sb
      .from('building_waitlist')
      .update({ building_id: building.id })
      .in('email', emails)
      .is('building_id', null);
  }
}

/** All waitlist rows for this building who have not been notified yet. */
export async function findUnnotifiedWaitlist(
  sb: SupabaseClient,
  building: BuildingForMatch,
): Promise<WaitlistRow[]> {
  await backfillWaitlistBuildingId(sb, building);

  const keys = candidateKeysForBuilding(building);
  const byId = new Map<string, WaitlistRow>();

  const merge = (rows: WaitlistRow[] | null) => {
    for (const row of rows ?? []) {
      if (!byId.has(row.id)) byId.set(row.id, row);
    }
  };

  const { data: byBuilding } = await sb
    .from('building_waitlist')
    .select('id, email, phone, profile_id, full_name')
    .eq('building_id', building.id)
    .is('notified_activation_at', null);
  merge(byBuilding);

  for (const key of keys) {
    const { data: byKey } = await sb
      .from('building_waitlist')
      .select('id, email, phone, profile_id, full_name')
      .eq('building_candidate_key', key)
      .is('notified_activation_at', null);
    merge(byKey);
  }

  const { data: requests } = await sb
    .from('building_requests')
    .select('resident_email')
    .eq('building_id', building.id);

  const requestEmails = [
    ...new Set(
      (requests ?? [])
        .map((r) => (typeof r.resident_email === 'string' ? r.resident_email.trim().toLowerCase() : ''))
        .filter((e) => e.includes('@')),
    ),
  ];

  if (requestEmails.length > 0) {
    const { data: byEmail } = await sb
      .from('building_waitlist')
      .select('id, email, phone, profile_id, full_name')
      .in('email', requestEmails)
      .is('notified_activation_at', null);
    merge(byEmail);
  }

  return [...byId.values()];
}
