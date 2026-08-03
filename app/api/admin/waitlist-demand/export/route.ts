import { NextResponse } from 'next/server';
import { buildDemandReport, demandReportToCsv } from '@/lib/waitlist-demand';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSessionUser } from '@/lib/supabase/server';

/**
 * CSV export for the building-demand prospecting list.
 *
 * Route handlers sit outside `app/(admin)/admin/layout.tsx`, so the admin
 * session check there does not cover this endpoint — it is redone here
 * explicitly. Without it this would be an unauthenticated export of every
 * resident email who ever joined a building waitlist.
 *
 * Renders through `demandReportToCsv`, the same function the admin page's
 * numbers come from — the export can't show a different ranking than the
 * page it's exported from.
 */
export async function GET() {
  const session = await getSessionUser().catch(() => null);
  if (!session || session.profile.role !== 'admin') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const sb = supabaseAdmin();
  let rows: Awaited<ReturnType<typeof buildDemandReport>>;
  try {
    rows = await buildDemandReport(sb);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Could not build report' },
      { status: 500 },
    );
  }

  const csv = demandReportToCsv(rows);
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="building-demand-${date}.csv"`,
    },
  });
}
