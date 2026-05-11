import { PageHeader } from '@/components/PortalShell';
import { supabaseServer } from '@/lib/supabase/server';
import { dateShort, money } from '@/lib/format';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function OperatorOverview() {
  const sb = supabaseServer();
  const { data: op } = await sb.from('operators').select('*').limit(1).maybeSingle();
  if (!op) redirect('/operator/onboarding');

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: buildings }, { data: upcoming }, { data: payouts }, { count: pendingRequests }] = await Promise.all([
    sb.from('partnerships')
      .select('id, building:buildings(name, city)')
      .eq('operator_id', op.id)
      .eq('status', 'active'),
    sb.from('wash_days')
      .select('id, scheduled_for, started_at, completed_at, building:buildings(name)')
      .eq('operator_id', op.id)
      .gte('scheduled_for', today)
      .order('scheduled_for')
      .limit(5),
    sb.from('payouts')
      .select('net_cents')
      .eq('operator_id', op.id)
      .order('period_end', { ascending: false })
      .limit(1),
    sb.from('partnerships')
      .select('id', { count: 'exact', head: true })
      .eq('operator_id', op.id)
      .eq('status', 'pending'),
  ]);

  const checklist = [
    { label: 'Application approved', done: op.status === 'approved' },
    { label: 'Stripe Connect set up', done: !!op.stripe_onboarding_complete, href: '/api/stripe/connect/onboard' },
    { label: 'Insurance certificate approved', done: op.insurance_review_status === 'approved', href: '/operator/profile' },
  ];
  const incomplete = checklist.filter((c) => !c.done);

  return (
    <>
      <PageHeader
        eyebrow={op.name}
        title="Operator overview"
        action={
          op.status !== 'approved'
            ? <span className="chip text-yellow-300">{op.status}</span>
            : op.stripe_onboarding_complete
            ? <span className="chip text-gleam">Active</span>
            : (
              <a href="/api/stripe/connect/onboard" className="btn-primary text-sm">
                Connect bank account →
              </a>
            )
        }
      />

      {incomplete.length > 0 && (
        <div className="mb-6 card border-yellow-400/30 bg-yellow-400/5 p-5">
          <div className="font-medium text-yellow-200">Finish setup to start receiving washes</div>
          <p className="mt-0.5 text-xs text-yellow-300/70">
            Residents can't book until everything below is checked off.
          </p>
          <ul className="mt-4 space-y-2">
            {checklist.map((c) => (
              <li key={c.label} className="flex items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className={c.done ? 'text-gleam' : 'text-ink-500'}>{c.done ? '✓' : '○'}</span>
                  <span className={c.done ? 'text-ink-300' : 'text-ink-100'}>{c.label}</span>
                </div>
                {!c.done && c.href && (
                  <a href={c.href} className="text-xs text-gleam hover:underline">Fix →</a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {upcoming?.[0] && (() => {
        const next = upcoming[0] as any;
        const isToday = next.scheduled_for === today;
        return (
          <div className={`mb-6 card p-5 ${isToday ? 'border-gleam/40 bg-gleam/5' : ''}`}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-widest text-gleam">{isToday ? 'Today' : 'Next wash day'}</div>
                <div className="mt-1 font-display text-2xl">{dateShort(next.scheduled_for)} · {next.building?.name}</div>
                {next.started_at && !next.completed_at && <div className="mt-1 text-xs text-amber-300">In progress</div>}
              </div>
              <div className="flex flex-col items-end gap-2">
                <Link href={`/operator/wash-days/${next.id}/prep`} className="btn-quiet text-xs">Prep list</Link>
                <Link href={`/operator/wash-days/${next.id}`} className="btn-primary text-xs">
                  {next.started_at ? 'Resume →' : 'Open crew tool →'}
                </Link>
              </div>
            </div>
          </div>
        );
      })()}

      {(pendingRequests ?? 0) > 0 && (
        <div className="mb-6 card border-yellow-400/20 bg-yellow-400/5 p-4 flex items-center justify-between">
          <span className="text-sm text-yellow-200">
            {pendingRequests} pending partnership {pendingRequests === 1 ? 'request' : 'requests'}
          </span>
          <Link href="/operator/bookings" className="text-sm text-gleam">Review →</Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="stat">
          <div className="text-xs text-ink-300">Active buildings</div>
          <div className="mt-2 font-display text-4xl">{buildings?.length ?? 0}</div>
        </div>
        <div className="stat">
          <div className="text-xs text-ink-300">Rating</div>
          <div className="mt-2 font-display text-4xl">★ {Number(op.rating_avg).toFixed(1)}</div>
          <div className="text-xs text-ink-400">{op.rating_count} reviews</div>
        </div>
        <div className="stat">
          <div className="text-xs text-ink-300">Last payout</div>
          <div className="mt-2 font-display text-4xl">{payouts?.[0] ? money(payouts[0].net_cents) : '—'}</div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-xl">Active buildings</h3>
            <Link href="/operator/buildings" className="text-xs text-gleam">All →</Link>
          </div>
          <ul className="divide-y divide-white/5">
            {(buildings ?? []).map((p: any) => (
              <li key={p.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="font-medium">{p.building.name}</div>
                  <div className="text-xs text-ink-400">{p.building.city}</div>
                </div>
              </li>
            ))}
            {!buildings?.length && (
              <li className="py-3 text-sm text-ink-400">No buildings assigned yet.</li>
            )}
          </ul>
        </div>

        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-xl">Upcoming wash days</h3>
            <Link href="/operator/wash-days" className="text-xs text-gleam">All →</Link>
          </div>
          <ul className="divide-y divide-white/5">
            {(upcoming ?? []).map((wd: any) => (
              <li key={wd.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm">{wd.building?.name}</div>
                  <div className="text-xs text-ink-400">{dateShort(wd.scheduled_for)}</div>
                </div>
                <Link href={`/operator/wash-days/${wd.id}`} className="text-xs text-gleam">
                  Open crew tool →
                </Link>
              </li>
            ))}
            {!upcoming?.length && (
              <li className="py-3 text-sm text-ink-400">Nothing scheduled.</li>
            )}
          </ul>
        </div>
      </div>
    </>
  );
}
