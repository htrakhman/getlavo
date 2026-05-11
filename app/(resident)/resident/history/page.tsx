import { PageHeader } from '@/components/PortalShell';
import { supabaseServer, getSessionUser } from '@/lib/supabase/server';
import { dateShort } from '@/lib/format';
import { redirect } from 'next/navigation';
import { RateWash } from '../washes/RateWash';

export default async function HistoryPage() {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  const sb = supabaseServer();

  const { data: resident } = await sb
    .from('residents')
    .select('id')
    .eq('profile_id', session.user.id)
    .maybeSingle();
  if (!resident) redirect('/resident/onboarding');

  const [{ data: washes }, { data: reviews }] = await Promise.all([
    sb.from('washes')
      .select('id, status, completed_at, photo_url, flag_reason, wash_day:wash_days(scheduled_for, building:buildings(name))')
      .eq('resident_id', resident.id)
      .order('completed_at', { ascending: false, nullsFirst: false })
      .limit(50),
    sb.from('wash_reviews')
      .select('wash_id, rating, comment')
      .eq('resident_id', resident.id),
  ]);

  const reviewMap = new Map((reviews ?? []).map((r: any) => [r.wash_id, r]));

  return (
    <>
      <PageHeader eyebrow="History" title="Past washes" />
      <div className="space-y-4">
        {(washes ?? []).map((w: any) => {
          const review = reviewMap.get(w.id);
          const washDay = w.wash_day as any;
          return (
            <div key={w.id} className="card p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-display text-xl">{dateShort(washDay?.scheduled_for ?? w.completed_at)}</div>
                  {washDay?.building?.name && (
                    <div className="text-sm text-ink-400">{washDay.building.name}</div>
                  )}
                  {w.flag_reason && <div className="mt-1 text-xs text-amber-300">⚑ {w.flag_reason}</div>}
                </div>
                <span className={`chip ${w.status === 'completed' ? 'text-gleam' : ''}`}>{w.status}</span>
              </div>
              {review ? (
                <div className="mt-3 text-sm text-ink-300">
                  {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                  {review.comment ? ` — ${review.comment}` : ''}
                </div>
              ) : w.status === 'completed' ? (
                <RateWash washId={w.id} alreadyRated={null} />
              ) : null}
            </div>
          );
        })}
        {!washes?.length && (
          <div className="card p-10 text-center text-ink-400">No completed washes yet.</div>
        )}
      </div>
    </>
  );
}
