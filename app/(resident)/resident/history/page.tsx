import { PageHeader } from '@/components/PortalShell';
import { getSessionUser } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { dateShort } from '@/lib/format';
import { washHistory, washOutcome } from '@/lib/wash-history';
import { redirect } from 'next/navigation';
import { RateWash } from '../washes/RateWash';

export default async function HistoryPage() {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  const sb = supabaseAdmin();

  const { data: resident } = await sb
    .from('residents')
    .select('id')
    .eq('profile_id', session.user.id)
    .maybeSingle();
  if (!resident) redirect('/resident/onboarding');

  const today = new Date().toISOString().slice(0, 10);

  // Admin client for the same reason as /resident/washes — supabaseServer()
  // silently returns nothing for these joined reads when auth.uid() is missing
  // from the PostgREST context, which showed every resident an empty history.
  // Identity is still scoped by the resident.id resolved from the session above.
  const [{ data: pastWashes, error: washesErr }, { data: reviews }, { data: skips }] = await Promise.all([
    sb.from('washes')
      .select('id, status, completed_at, photo_url, flag_reason, wash_day_id, wash_day:wash_days(scheduled_for, building:buildings(name))')
      .eq('resident_id', resident.id)
      .order('completed_at', { ascending: false, nullsFirst: false })
      .limit(200),
    sb.from('wash_reviews')
      .select('wash_id, rating, comment')
      .eq('resident_id', resident.id),
    sb.from('wash_skips')
      .select('wash_day_id')
      .eq('resident_id', resident.id),
  ]);

  if (washesErr) {
    console.error('[history] wash query error:', washesErr.message, washesErr.details);
  }

  const reviewMap = new Map((reviews ?? []).map((r: any) => [r.wash_id, r]));
  const skipIds = new Set((skips ?? []).map((s: any) => s.wash_day_id));
  const washes = washHistory(pastWashes as any[], today, 50);

  return (
    <>
      <PageHeader eyebrow="History" title="Past washes" />
      <div className="space-y-4">
        {washes.map((w: any) => {
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
                  {w.flag_reason && <div className="mt-1 text-xs text-amber-600">⚑ {w.flag_reason}</div>}
                </div>
                <span className={`chip ${w.status === 'completed' ? 'text-gleam' : ''}`}>
                  {washOutcome(w, skipIds.has(w.wash_day_id))}
                </span>
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
        {!washes.length && (
          <div className="card p-10 text-center text-ink-400">No washes yet — your first one will show up here once it’s done.</div>
        )}
      </div>
    </>
  );
}
