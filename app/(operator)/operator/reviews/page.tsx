import { PageHeader } from '@/components/PortalShell';
import { supabaseServer } from '@/lib/supabase/server';

export default async function ReviewsPage() {
  const sb = supabaseServer();
  const { data: op } = await sb.from('operators').select('id, name, rating_avg, rating_count').limit(1).maybeSingle();
  if (!op) return <div className="p-6">No operator profile.</div>;

  const { data: reviews } = await sb
    .from('wash_reviews')
    .select(`
      id, rating, comment, created_at,
      wash:washes(id, wash_day:wash_days(scheduled_for, building:buildings(name))),
      resident:residents(profile:profiles(full_name))
    `)
    .eq('operator_id', op.id)
    .order('created_at', { ascending: false })
    .limit(100);

  const buckets = [5, 4, 3, 2, 1].map((n) => ({
    n,
    count: (reviews ?? []).filter((r: any) => r.rating === n).length,
  }));
  const total = reviews?.length ?? 0;

  return (
    <>
      <PageHeader eyebrow={op.name} title="Reviews" />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 mb-8">
        <div className="card p-6 md:col-span-1">
          <div className="text-xs uppercase tracking-widest text-ink-300">Average</div>
          <div className="mt-2 font-display text-5xl">
            {Number(op.rating_avg ?? 0).toFixed(1)}
            <span className="text-gleam"> ★</span>
          </div>
          <div className="mt-1 text-sm text-ink-400">{op.rating_count ?? 0} review{op.rating_count === 1 ? '' : 's'}</div>
        </div>
        <div className="card p-6 md:col-span-2">
          <div className="space-y-2">
            {buckets.map((b) => {
              const pct = total ? (b.count / total) * 100 : 0;
              return (
                <div key={b.n} className="flex items-center gap-3 text-sm">
                  <span className="w-6 text-ink-300">{b.n}★</span>
                  <div className="h-2 flex-1 rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-gleam" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-8 text-right text-ink-400">{b.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {!reviews?.length ? (
        <div className="card p-10 text-center text-ink-400">No reviews yet.</div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r: any) => (
            <div key={r.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="text-gleam">
                  {Array.from({ length: r.rating }).map(() => '★').join('')}
                  <span className="text-ink-500">{Array.from({ length: 5 - r.rating }).map(() => '★').join('')}</span>
                </div>
                <div className="text-xs text-ink-400">
                  {new Date(r.created_at).toLocaleDateString()}
                </div>
              </div>
              {r.comment && <p className="mt-2 text-sm text-ink-200">{r.comment}</p>}
              <div className="mt-2 text-xs text-ink-500">
                {r.resident?.profile?.full_name ?? 'Resident'} · {r.wash?.wash_day?.building?.name ?? 'Building'} · {r.wash?.wash_day?.scheduled_for}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
