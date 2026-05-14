import { PageHeader } from '@/components/PortalShell';
import { supabaseAdmin } from '@/lib/supabase/admin';

type Row = {
  building_candidate_key: string;
  n: number;
  last_at: string;
  sample_address: string | null;
};

export default async function AdminBuildingRequestsPage() {
  const sb = supabaseAdmin();
  const { data: rows, error } = await sb
    .from('building_requests')
    .select('building_candidate_key, requested_at, formatted_address, building_display_name')
    .order('requested_at', { ascending: false })
    .limit(5000);

  if (error) {
    return (
      <>
        <PageHeader eyebrow="Admin" title="Building funnel" />
        <p className="text-sm text-red-400">Could not load building_requests. Apply migration 0020 and refresh.</p>
        <p className="text-xs text-ink-500 mt-2">{error.message}</p>
      </>
    );
  }

  const map = new Map<string, { n: number; last: string; sample: string | null }>();
  for (const r of rows ?? []) {
    const k = r.building_candidate_key;
    if (!k) continue;
    const cur = map.get(k);
    const label = r.formatted_address ?? r.building_display_name;
    if (!cur) map.set(k, { n: 1, last: r.requested_at, sample: label ?? null });
    else {
      cur.n += 1;
      if (r.requested_at > cur.last) cur.last = r.requested_at;
      if (!cur.sample && label) cur.sample = label;
    }
  }

  const sorted: Row[] = [...map.entries()]
    .map(([building_candidate_key, v]) => ({
      building_candidate_key,
      n: v.n,
      last_at: v.last,
      sample_address: v.sample,
    }))
    .sort((a, b) => b.n - a.n);

  return (
    <>
      <PageHeader eyebrow="Admin" title="Building demand" />
      <p className="text-sm text-ink-400 mb-6">
        Aggregated <code className="text-gleam">building_requests</code> by candidate key. Cron alerts fire at 5+ rows (
        <code className="text-gleam">/api/cron/building-threshold</code>).
      </p>
      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-widest text-ink-500">
              <th className="py-3 pr-4">Key</th>
              <th className="py-3 pr-4">Requests</th>
              <th className="py-3 pr-4">Last activity</th>
              <th className="py-3">Sample address</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.building_candidate_key} className="border-b border-white/5">
                <td className="py-2 pr-4 font-mono text-xs text-ink-300 break-all">{r.building_candidate_key}</td>
                <td className="py-2 pr-4 text-gleam">{r.n}</td>
                <td className="py-2 pr-4 text-ink-400">{new Date(r.last_at).toLocaleString()}</td>
                <td className="py-2 text-ink-300">{r.sample_address ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {sorted.length === 0 && <p className="p-6 text-sm text-ink-500">No funnel rows yet.</p>}
      </div>
    </>
  );
}
