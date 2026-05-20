import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildingCandidateKey,
  candidateKeysFromText,
  locationTextsMatch,
} from '@/lib/building-candidate';

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
  building_label?: string | null;
  formatted_address?: string | null;
  building_candidate_key?: string;
};

/** Candidate keys used to tie pre-launch requests to a buildings row. */
export function candidateKeysForBuilding(building: BuildingForMatch): string[] {
  const keys = new Set<string>();
  const pid = building.google_place_id?.trim();
  if (pid) keys.add(`place:${pid}`);

  const fullAddress = [building.address_line1, building.city, building.region].filter(Boolean).join(', ');

  for (const key of candidateKeysFromText(
    building.address_line1,
    fullAddress,
    building.name,
  )) {
    keys.add(key);
  }

  return [...keys];
}

function waitlistRowMatchesBuilding(row: WaitlistRow, building: BuildingForMatch, keys: Set<string>) {
  if (row.building_candidate_key && keys.has(row.building_candidate_key)) return true;

  const fullAddress = [building.address_line1, building.city, building.region].filter(Boolean).join(', ');

  if (locationTextsMatch(row.building_label, building.name)) return true;
  if (locationTextsMatch(row.building_label, building.address_line1)) return true;
  if (locationTextsMatch(row.building_label, fullAddress)) return true;
  if (locationTextsMatch(row.formatted_address, building.address_line1)) return true;
  if (locationTextsMatch(row.formatted_address, fullAddress)) return true;
  if (locationTextsMatch(row.formatted_address, building.name)) return true;

  return false;
}

/** Link orphan waitlist rows to this building before notify. */
export async function backfillWaitlistBuildingId(
  sb: SupabaseClient,
  building: BuildingForMatch,
): Promise<void> {
  const keys = new Set(candidateKeysForBuilding(building));

  const { data: byBuildingId } = await sb
    .from('building_requests')
    .select('building_candidate_key, formatted_address, building_display_name, resident_email')
    .eq('building_id', building.id);

  const { data: byKeys } =
    keys.size > 0
      ? await sb
          .from('building_requests')
          .select('building_candidate_key, formatted_address, building_display_name, resident_email')
          .in('building_candidate_key', [...keys])
      : { data: [] as typeof byBuildingId };

  const requests = [...(byBuildingId ?? []), ...(byKeys ?? [])];

  for (const r of requests) {
    if (typeof r.building_candidate_key === 'string') keys.add(r.building_candidate_key);
    for (const k of candidateKeysFromText(r.formatted_address, r.building_display_name)) {
      keys.add(k);
    }
  }

  if (keys.size > 0) {
    await sb
      .from('building_waitlist')
      .update({ building_id: building.id })
      .in('building_candidate_key', [...keys])
      .is('building_id', null);
  }

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

  const { data: unlinked } = await sb
    .from('building_waitlist')
    .select('id, building_label, formatted_address, building_candidate_key')
    .is('building_id', null)
    .is('notified_activation_at', null);

  for (const row of unlinked ?? []) {
    if (waitlistRowMatchesBuilding(row, building, keys)) {
      await sb.from('building_waitlist').update({ building_id: building.id }).eq('id', row.id);
    }
  }
}

/** All waitlist rows for this building who have not been notified yet. */
export async function findUnnotifiedWaitlist(
  sb: SupabaseClient,
  building: BuildingForMatch,
): Promise<WaitlistRow[]> {
  await backfillWaitlistBuildingId(sb, building);

  const keys = new Set(candidateKeysForBuilding(building));

  const { data: requests } = await sb
    .from('building_requests')
    .select('building_candidate_key, formatted_address, building_display_name, resident_email')
    .eq('building_id', building.id);

  for (const r of requests ?? []) {
    if (typeof r.building_candidate_key === 'string') keys.add(r.building_candidate_key);
    for (const k of candidateKeysFromText(r.formatted_address, r.building_display_name)) {
      keys.add(k);
    }
  }

  const byId = new Map<string, WaitlistRow>();

  const merge = (rows: WaitlistRow[] | null) => {
    for (const row of rows ?? []) {
      if (!byId.has(row.id)) byId.set(row.id, row);
    }
  };

  const { data: byBuilding } = await sb
    .from('building_waitlist')
    .select('id, email, phone, profile_id, full_name, building_label, formatted_address, building_candidate_key')
    .eq('building_id', building.id)
    .is('notified_activation_at', null);
  merge(byBuilding);

  if (keys.size > 0) {
    const { data: byKey } = await sb
      .from('building_waitlist')
      .select('id, email, phone, profile_id, full_name, building_label, formatted_address, building_candidate_key')
      .in('building_candidate_key', [...keys])
      .is('notified_activation_at', null);
    merge(byKey);
  }

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
      .select('id, email, phone, profile_id, full_name, building_label, formatted_address, building_candidate_key')
      .in('email', requestEmails)
      .is('notified_activation_at', null);
    merge(byEmail);
  }

  const { data: pending } = await sb
    .from('building_waitlist')
    .select('id, email, phone, profile_id, full_name, building_label, formatted_address, building_candidate_key')
    .is('notified_activation_at', null);

  for (const row of pending ?? []) {
    if (!byId.has(row.id) && waitlistRowMatchesBuilding(row, building, keys)) {
      byId.set(row.id, row);
    }
  }

  return [...byId.values()];
}
