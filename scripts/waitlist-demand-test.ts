/**
 * Regression guard for the building-demand prospecting view.
 * Run: npm run validate:waitlist-demand
 *
 * This is the view a property manager's ranking gets read off of, so the
 * invariants that matter are: address-spelling variants collapse into one
 * row (or the ranking undercounts real demand and buries the prospect), a
 * resolved building always wins its display name over resident-typed text,
 * repeat submissions from one email do not inflate a building's rank, and
 * the CSV export shows the exact same numbers as the page.
 */

import { buildDemandReport, demandReportToCsv, type WaitlistDemandRow } from '../lib/waitlist-demand';

let failures = 0;

function check(label: string, condition: boolean, detail?: string): void {
  if (condition) {
    console.log(`  ok   ${label}`);
    return;
  }
  failures += 1;
  console.error(`  FAIL ${label}${detail ? `\n       ${detail}` : ''}`);
}

// ---------------------------------------------------------------------------
// Minimal Supabase-shaped fake. buildDemandReport only ever calls
// `.from(table).select(...).order(...).limit(...)` for building_waitlist and
// `.from('buildings').select(...).in('id', ids)` for the name/unit lookup —
// this mock supports exactly that chain and nothing more, so a query the
// function starts making that this mock does not model fails loudly instead
// of silently returning undefined.
// ---------------------------------------------------------------------------
type Row = Record<string, unknown>;

function makeFakeSupabase(tables: Record<string, Row[]>) {
  return {
    from(table: string) {
      const rows = tables[table] ?? [];
      let filtered = rows;

      const builder = {
        select() {
          return builder;
        },
        order() {
          return builder;
        },
        limit() {
          return builder;
        },
        in(column: string, values: unknown[]) {
          const set = new Set(values);
          filtered = filtered.filter((r) => set.has(r[column]));
          return builder;
        },
        then(resolve: (v: { data: Row[]; error: null }) => void) {
          resolve({ data: filtered, error: null });
        },
      };
      return builder;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

function iso(daysAgo: number): string {
  // Fixed anchor rather than Date.now() so the suite is deterministic.
  const anchor = Date.parse('2026-08-03T00:00:00Z');
  return new Date(anchor - daysAgo * 86_400_000).toISOString();
}

function byBuilding(rows: WaitlistDemandRow[], name: string): WaitlistDemandRow | undefined {
  return rows.find((r) => r.buildingName === name);
}

async function main() {
  // ---------------------------------------------------------------------------
  console.log('\naddress-spelling variants collapse into one prospect row');
  // ---------------------------------------------------------------------------
  {
    const sb = makeFakeSupabase({
      building_waitlist: [
        {
          id: '1',
          building_id: null,
          building_candidate_key: 'addr:aaa',
          building_label: 'The Metro',
          formatted_address: '123 Main St, Jersey City, NJ 07302',
          normalized_address: '123 Main St, Jersey City, NJ 07302',
          address_key: '123-main-st|07302',
          unit_count: null,
          email: 'a@example.com',
          created_at: iso(10),
        },
        {
          id: '2',
          building_id: null,
          building_candidate_key: 'addr:bbb',
          building_label: 'Metro Apartments',
          formatted_address: '123 Main Street, Apt 4B, Jersey City, NJ 07302',
          normalized_address: '123 Main St, Jersey City, NJ 07302',
          address_key: '123-main-st|07302',
          unit_count: null,
          email: 'b@example.com',
          created_at: iso(3),
        },
        {
          id: '3',
          building_id: null,
          building_candidate_key: 'addr:ccc',
          building_label: 'Metro Apartments',
          formatted_address: '123 main st., jersey city, nj 07302',
          normalized_address: '123 Main St, Jersey City, NJ 07302',
          address_key: '123-main-st|07302',
          unit_count: null,
          email: 'c@example.com',
          created_at: iso(1),
        },
      ],
      buildings: [],
    });

    const report = await buildDemandReport(sb);
    check('three spellings collapse into one row', report.length === 1, JSON.stringify(report));
    check('signup count is 3', report[0]?.signupCount === 3, String(report[0]?.signupCount));
    check(
      'the majority label wins the display name',
      report[0]?.buildingName === 'Metro Apartments',
      report[0]?.buildingName,
    );
    check('first signup is the oldest row', report[0]?.firstSignupAt === iso(10));
    check('most recent signup is the newest row', report[0]?.mostRecentSignupAt === iso(1));
  }

  // ---------------------------------------------------------------------------
  console.log('\na resolved building wins its canonical name over resident-typed text');
  // ---------------------------------------------------------------------------
  {
    const sb = makeFakeSupabase({
      building_waitlist: [
        {
          id: '1',
          building_id: 'b-1',
          building_candidate_key: 'building:b-1',
          building_label: 'the shor north', // resident typo
          formatted_address: '10 Shore Way, Jersey City, NJ',
          normalized_address: '10 Shore Way, Jersey City, NJ',
          address_key: '10-shore-way|jersey city nj',
          unit_count: null,
          email: 'd@example.com',
          created_at: iso(5),
        },
      ],
      buildings: [
        { id: 'b-1', name: 'The Shore North', address_line1: '10 Shore Way', city: 'Jersey City', region: 'NJ', total_units: 220 },
      ],
    });

    const report = await buildDemandReport(sb);
    check('canonical building name is used, not resident typo', report[0]?.buildingName === 'The Shore North');
    check('unit count comes from the buildings table', report[0]?.unitCount === 220);
    check('resolved building keeps its address from buildings, not resident text', report[0]?.address === '10 Shore Way, Jersey City, NJ');
  }

  // ---------------------------------------------------------------------------
  console.log('\nrepeat submissions from one email do not inflate rank');
  // ---------------------------------------------------------------------------
  {
    const sb = makeFakeSupabase({
      building_waitlist: [
        {
          id: '1',
          building_id: 'b-2',
          building_candidate_key: 'building:b-2',
          building_label: 'Building B',
          formatted_address: '5 B St',
          normalized_address: '5 B St',
          address_key: '5-b-st',
          unit_count: null,
          email: 'repeat@example.com',
          created_at: iso(9),
        },
        {
          id: '2',
          building_id: 'b-2',
          building_candidate_key: 'building:b-2',
          building_label: 'Building B',
          formatted_address: '5 B St',
          normalized_address: '5 B St',
          address_key: '5-b-st',
          unit_count: null,
          email: 'REPEAT@example.com', // same person, different casing
          created_at: iso(2),
        },
        {
          id: '3',
          building_id: 'b-3',
          building_candidate_key: 'building:b-3',
          building_label: 'Building C',
          formatted_address: '9 C St',
          normalized_address: '9 C St',
          address_key: '9-c-st',
          unit_count: null,
          email: 'one@example.com',
          created_at: iso(1),
        },
        {
          id: '4',
          building_id: 'b-3',
          building_candidate_key: 'building:b-3',
          building_label: 'Building C',
          formatted_address: '9 C St',
          normalized_address: '9 C St',
          address_key: '9-c-st',
          unit_count: null,
          email: 'two@example.com',
          created_at: iso(1),
        },
      ],
      buildings: [
        { id: 'b-2', name: 'Building B', address_line1: '5 B St', city: '', region: '', total_units: null },
        { id: 'b-3', name: 'Building C', address_line1: '9 C St', city: '', region: '', total_units: null },
      ],
    });

    const report = await buildDemandReport(sb);
    const b = byBuilding(report, 'Building B');
    const c = byBuilding(report, 'Building C');

    check('one email submitting twice counts once', b?.signupCount === 1, String(b?.signupCount));
    check('two distinct emails count as two', c?.signupCount === 2, String(c?.signupCount));
    check(
      'the building with more distinct signups ranks first despite fewer raw rows',
      report[0]?.buildingName === 'Building C',
      report.map((r) => `${r.buildingName}:${r.signupCount}`).join(', '),
    );
  }

  // ---------------------------------------------------------------------------
  console.log('\nsort order: signup count descending, recency breaks ties');
  // ---------------------------------------------------------------------------
  {
    const sb = makeFakeSupabase({
      building_waitlist: [
        { id: '1', building_id: 'low', building_candidate_key: 'building:low', building_label: 'Low', formatted_address: '', normalized_address: null, address_key: null, unit_count: null, email: 'x1@example.com', created_at: iso(5) },
        { id: '2', building_id: 'high-old', building_candidate_key: 'building:high-old', building_label: 'HighOld', formatted_address: '', normalized_address: null, address_key: null, unit_count: null, email: 'x2@example.com', created_at: iso(20) },
        { id: '3', building_id: 'high-old', building_candidate_key: 'building:high-old', building_label: 'HighOld', formatted_address: '', normalized_address: null, address_key: null, unit_count: null, email: 'x3@example.com', created_at: iso(15) },
        { id: '4', building_id: 'high-old', building_candidate_key: 'building:high-old', building_label: 'HighOld', formatted_address: '', normalized_address: null, address_key: null, unit_count: null, email: 'x4@example.com', created_at: iso(12) },
        { id: '5', building_id: 'high-new', building_candidate_key: 'building:high-new', building_label: 'HighNew', formatted_address: '', normalized_address: null, address_key: null, unit_count: null, email: 'x5@example.com', created_at: iso(4) },
        { id: '6', building_id: 'high-new', building_candidate_key: 'building:high-new', building_label: 'HighNew', formatted_address: '', normalized_address: null, address_key: null, unit_count: null, email: 'x6@example.com', created_at: iso(3) },
        { id: '7', building_id: 'high-new', building_candidate_key: 'building:high-new', building_label: 'HighNew', formatted_address: '', normalized_address: null, address_key: null, unit_count: null, email: 'x7@example.com', created_at: iso(2) },
      ],
      buildings: [
        { id: 'low', name: 'Low', address_line1: '', city: '', region: '', total_units: null },
        { id: 'high-old', name: 'HighOld', address_line1: '', city: '', region: '', total_units: null },
        { id: 'high-new', name: 'HighNew', address_line1: '', city: '', region: '', total_units: null },
      ],
    });

    const report = await buildDemandReport(sb);
    check('highest signup count sorts first', report[0]?.signupCount === 3);
    check('the lowest-count building sorts last', report[report.length - 1]?.buildingName === 'Low');
    check(
      'a tie in signup count is broken by most recent activity',
      report[0]?.buildingName === 'HighNew',
      report.map((r) => `${r.buildingName}:${r.signupCount}@${r.mostRecentSignupAt}`).join(', '),
    );
  }

  // ---------------------------------------------------------------------------
  console.log('\nunresolved addresses without any building match still surface');
  // ---------------------------------------------------------------------------
  {
    const sb = makeFakeSupabase({
      building_waitlist: [
        {
          id: '1',
          building_id: null,
          building_candidate_key: null,
          building_label: null,
          formatted_address: null,
          normalized_address: null,
          address_key: null,
          unit_count: null,
          email: 'legacy@example.com',
          created_at: iso(30),
        },
      ],
      buildings: [],
    });

    const report = await buildDemandReport(sb);
    check('a legacy row with no address text is not dropped', report.length === 1, JSON.stringify(report));
    check('it gets a readable placeholder name', report[0]?.buildingName === 'Unresolved address');
  }

  // ---------------------------------------------------------------------------
  console.log('\nCSV export matches the report exactly');
  // ---------------------------------------------------------------------------
  {
    const rows: WaitlistDemandRow[] = [
      {
        groupKey: 'building:1',
        buildingId: '1',
        buildingName: 'Comma, Building "Quote"',
        address: '1 Main St, Newark, NJ',
        unitCount: 50,
        signupCount: 4,
        firstSignupAt: iso(9),
        mostRecentSignupAt: iso(1),
        emails: ['a@example.com'],
      },
    ];
    const csv = demandReportToCsv(rows);
    const lines = csv.trim().split('\r\n');

    check('header row present', lines[0] === 'building_name,address,unit_count,signup_count,first_signup_at,most_recent_signup_at,resolved_building_id');
    check('one data row per report row', lines.length === 2, String(lines.length));
    check(
      'a name containing a comma and quotes is CSV-escaped',
      lines[1]!.startsWith('"Comma, Building ""Quote""",'),
      lines[1],
    );
    check('signup count round-trips into the CSV', lines[1]!.includes(',4,'), lines[1]);
  }

  console.log('');
  if (failures > 0) {
    console.error(`${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log('All waitlist demand checks passed.');
}

main();
