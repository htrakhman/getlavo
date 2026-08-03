import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeAddress, waitlistGroupKey } from '@/lib/address-normalize';

/**
 * Aggregates `building_waitlist` into one row per building for the admin
 * prospecting view and its CSV export.
 *
 * Both callers import `buildDemandReport` rather than each running their own
 * grouping query, for the same reason `FaqBlock` renders from one array: two
 * independent aggregations of the same table drift the moment one of them is
 * edited, and a prospecting list that disagrees with its own export is worse
 * than not having one.
 */

export type WaitlistDemandRow = {
  groupKey: string;
  buildingId: string | null;
  buildingName: string;
  address: string | null;
  unitCount: number | null;
  signupCount: number;
  firstSignupAt: string;
  mostRecentSignupAt: string;
  emails: string[];
};

type RawWaitlistRow = {
  id: string;
  building_id: string | null;
  building_candidate_key: string | null;
  building_label: string | null;
  formatted_address: string | null;
  normalized_address: string | null;
  address_key: string | null;
  unit_count: number | null;
  email: string | null;
  created_at: string;
};

const WAITLIST_SELECT =
  'id, building_id, building_candidate_key, building_label, formatted_address, normalized_address, address_key, unit_count, email, created_at';

/**
 * Pull every waitlist row and group it into one prospecting row per building.
 *
 * A building with a `buildings.id` groups on that id — authoritative, and
 * immune to two residents spelling the address differently. An unresolved
 * address groups on `address_key` from `lib/address-normalize.ts`, which is
 * what makes "123 Main St" and "123 Main Street Apt 4B" one row instead of
 * two. Rows with neither (pre-migration legacy inserts with no address text
 * at all) fall back to the old `building_candidate_key` so they still appear
 * rather than vanishing from the report.
 *
 * Signup count is deduped by email within a group — a resident who submits
 * the join form twice must not double their building's demand score, since
 * this number is read directly as "how many households want this building."
 */
export async function buildDemandReport(sb: SupabaseClient): Promise<WaitlistDemandRow[]> {
  const { data, error } = await sb
    .from('building_waitlist')
    .select(WAITLIST_SELECT)
    .order('created_at', { ascending: true })
    .limit(20_000);

  if (error) throw new Error(`building_waitlist query failed: ${error.message}`);

  const rows = (data ?? []) as RawWaitlistRow[];
  const buildingIds = [...new Set(rows.map((r) => r.building_id).filter((v): v is string => Boolean(v)))];

  const buildingNames = new Map<string, { name: string; address: string | null; totalUnits: number | null }>();
  if (buildingIds.length > 0) {
    const { data: buildings } = await sb
      .from('buildings')
      .select('id, name, address_line1, city, region, total_units')
      .in('id', buildingIds);
    for (const b of buildings ?? []) {
      const address = [b.address_line1, [b.city, b.region].filter(Boolean).join(', ')]
        .filter(Boolean)
        .join(', ');
      buildingNames.set(b.id, {
        name: b.name,
        address: address || null,
        totalUnits: b.total_units ?? null,
      });
    }
  }

  type Group = {
    buildingId: string | null;
    labelCounts: Map<string, number>;
    address: string | null;
    unitCount: number | null;
    rowsByEmail: Map<string, RawWaitlistRow>;
    anonymousRows: RawWaitlistRow[];
  };

  const groups = new Map<string, Group>();

  for (const row of rows) {
    // Legacy rows predate this migration and carry neither address text nor a
    // resolved building — normalizeAddress() only helps rows that have text.
    const addressKey = row.address_key || normalizeAddress(row.formatted_address).key || null;
    const key = waitlistGroupKey({
      buildingId: row.building_id,
      addressKey,
      candidateKey: row.building_candidate_key,
    });

    const freshGroup: Group = {
      buildingId: row.building_id,
      labelCounts: new Map(),
      address: null,
      unitCount: null,
      rowsByEmail: new Map(),
      anonymousRows: [],
    };
    const group = groups.get(key) ?? freshGroup;

    if (row.building_label) {
      group.labelCounts.set(row.building_label, (group.labelCounts.get(row.building_label) ?? 0) + 1);
    }
    if (!group.address && (row.normalized_address || row.formatted_address)) {
      group.address = row.normalized_address || row.formatted_address;
    }
    if (group.unitCount == null && row.unit_count != null) {
      group.unitCount = row.unit_count;
    }

    const email = row.email?.trim().toLowerCase();
    if (email) {
      // First submission per email wins so first/most-recent dates reflect
      // actual distinct signups, not repeat clicks; rows are read oldest-first.
      if (!group.rowsByEmail.has(email)) group.rowsByEmail.set(email, row);
    } else {
      group.anonymousRows.push(row);
    }

    groups.set(key, group);
  }

  const report: WaitlistDemandRow[] = [];

  for (const [groupKey, group] of groups) {
    const dedupedRows = [...group.rowsByEmail.values(), ...group.anonymousRows];
    if (dedupedRows.length === 0) continue;

    const timestamps = dedupedRows.map((r) => r.created_at).sort();
    const resolved = group.buildingId ? buildingNames.get(group.buildingId) : undefined;

    const mostCommonLabel = [...group.labelCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

    report.push({
      groupKey,
      buildingId: group.buildingId,
      buildingName: resolved?.name ?? mostCommonLabel ?? 'Unresolved address',
      address: resolved?.address ?? group.address,
      unitCount: resolved?.totalUnits ?? group.unitCount,
      signupCount: dedupedRows.length,
      firstSignupAt: timestamps[0]!,
      mostRecentSignupAt: timestamps[timestamps.length - 1]!,
      emails: [...group.rowsByEmail.keys()],
    });
  }

  // Signup count descending is the point of the view; recency breaks ties so
  // two buildings with equal demand surface the one that is heating up now.
  report.sort(
    (a, b) => b.signupCount - a.signupCount || b.mostRecentSignupAt.localeCompare(a.mostRecentSignupAt),
  );

  return report;
}

/** CSV export of a demand report. Shared by the admin page's export link and any future script. */
export function demandReportToCsv(rows: readonly WaitlistDemandRow[]): string {
  const header = [
    'building_name',
    'address',
    'unit_count',
    'signup_count',
    'first_signup_at',
    'most_recent_signup_at',
    'resolved_building_id',
  ];

  const lines = rows.map((r) =>
    [
      r.buildingName,
      r.address ?? '',
      r.unitCount ?? '',
      String(r.signupCount),
      r.firstSignupAt,
      r.mostRecentSignupAt,
      r.buildingId ?? '',
    ]
      .map(csvCell)
      .join(','),
  );

  return [header.join(','), ...lines].join('\r\n') + '\r\n';
}

function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
