import Link from 'next/link';
import { PageHeader } from '@/components/PortalShell';
import { buildDemandReport } from '@/lib/waitlist-demand';
import { supabaseAdmin } from '@/lib/supabase/admin';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Building-level waitlist demand, sorted by signup count.
 *
 * This is the property-manager prospecting list: every unserved building with
 * at least one resident signup, ranked by proven demand. "Proven" is doing
 * real work in that sentence — signups are deduped by email in
 * `buildDemandReport` so one resident mashing the join button twice cannot
 * inflate a building's rank above one with two distinct households.
 */
export default async function AdminWaitlistDemandPage() {
  const sb = supabaseAdmin();

  let rows: Awaited<ReturnType<typeof buildDemandReport>> = [];
  let loadError: string | null = null;
  try {
    rows = await buildDemandReport(sb);
  } catch (e) {
    loadError = e instanceof Error ? e.message : 'Could not load waitlist demand.';
  }

  const totalSignups = rows.reduce((sum, r) => sum + r.signupCount, 0);

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Building demand"
        action={
          <Link
            href="/api/admin/waitlist-demand/export"
            className="btn-ghost px-4 py-2 text-sm"
            prefetch={false}
          >
            Export CSV
          </Link>
        }
      />

      <p className="mb-6 text-sm text-ink-400">
        <code className="text-gleam">building_waitlist</code> grouped by building, ranked by distinct
        resident signups. Rows collapse across address spellings —{' '}
        <code className="text-gleam">lib/address-normalize.ts</code> is what makes "123 Main St" and
        "123 Main Street Apt 4B" one row. {rows.length} buildings, {totalSignups} signups.
      </p>

      {loadError ? (
        <p className="text-sm text-red-400">{loadError}</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-widest text-ink-500">
                <th className="py-3 pl-4 pr-4">Building</th>
                <th className="py-3 pr-4">Address</th>
                <th className="py-3 pr-4 text-right">Units</th>
                <th className="py-3 pr-4 text-right">Signups</th>
                <th className="py-3 pr-4">First signup</th>
                <th className="py-3 pr-4">Most recent</th>
                <th className="py-3 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.groupKey} className="border-b border-white/5 align-top">
                  <td className="py-3 pl-4 pr-4 font-medium text-ink-100">{r.buildingName}</td>
                  <td className="py-3 pr-4 text-ink-300">{r.address ?? '—'}</td>
                  <td className="py-3 pr-4 text-right text-ink-300">{r.unitCount ?? '—'}</td>
                  <td className="py-3 pr-4 text-right">
                    <span className="font-semibold text-gleam">{r.signupCount}</span>
                  </td>
                  <td className="py-3 pr-4 text-ink-400">{formatDate(r.firstSignupAt)}</td>
                  <td className="py-3 pr-4 text-ink-400">{formatDate(r.mostRecentSignupAt)}</td>
                  <td className="py-3 pr-4">
                    {r.buildingId ? (
                      <Link href={`/admin/buildings/${r.buildingId}`} className="chip text-gleam hover:underline">
                        In buildings
                      </Link>
                    ) : (
                      <span className="chip">Unresolved</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="p-6 text-sm text-ink-500">No waitlist signups yet.</p>}
        </div>
      )}
    </>
  );
}
