import { PageHeader } from '@/components/PortalShell';
import { supabaseServer } from '@/lib/supabase/server';

export default async function HealthPage() {
  const sb = supabaseServer();

  const [{ data: errors }, { data: jobs }, { data: lastReminder }] = await Promise.all([
    sb.from('error_logs').select('id, source, message, created_at').order('created_at', { ascending: false }).limit(20),
    sb.from('job_runs').select('id, job_name, status, duration_ms, detail, created_at').order('created_at', { ascending: false }).limit(20),
    sb.from('job_runs').select('created_at, status, detail').eq('job_name', 'wash_day_reminder').order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ]);

  const reminderHealthy = lastReminder
    ? Date.now() - new Date(lastReminder.created_at).getTime() < 30 * 60 * 60 * 1000 // within 30h
    : false;

  return (
    <>
      <PageHeader eyebrow="Admin" title="System health" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-8">
        <div className="card p-5">
          <div className="text-xs uppercase tracking-widest text-ink-300">Wash-day reminder cron</div>
          <div className={`mt-2 font-display text-2xl ${reminderHealthy ? 'text-gleam' : 'text-red-400'}`}>
            {reminderHealthy ? 'Healthy' : 'Stale'}
          </div>
          <div className="mt-1 text-xs text-ink-400">
            Last run: {lastReminder ? new Date(lastReminder.created_at).toLocaleString() : 'never'}
          </div>
          {lastReminder?.detail && (
            <div className="mt-1 text-xs text-ink-500">Sent: {(lastReminder.detail as any)?.sent ?? 0}</div>
          )}
        </div>
        <div className="card p-5">
          <div className="text-xs uppercase tracking-widest text-ink-300">Recent errors</div>
          <div className="mt-2 font-display text-2xl">{errors?.length ?? 0}</div>
          <div className="mt-1 text-xs text-ink-400">In the last 20 entries</div>
        </div>
        <div className="card p-5">
          <div className="text-xs uppercase tracking-widest text-ink-300">Recent jobs</div>
          <div className="mt-2 font-display text-2xl">{jobs?.length ?? 0}</div>
          <div className="mt-1 text-xs text-ink-400">Logged in last 20 entries</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-xs uppercase tracking-widest text-ink-400">Recent errors</h2>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-widest text-ink-400">
                <tr><th className="px-4 py-2 text-left">When</th><th className="px-4 py-2 text-left">Source</th><th className="px-4 py-2 text-left">Message</th></tr>
              </thead>
              <tbody>
                {(errors ?? []).map((e: any) => (
                  <tr key={e.id} className="border-t border-white/5">
                    <td className="px-4 py-2 text-xs text-ink-400">{new Date(e.created_at).toLocaleString()}</td>
                    <td className="px-4 py-2 text-xs text-gleam">{e.source}</td>
                    <td className="px-4 py-2 text-xs">{e.message}</td>
                  </tr>
                ))}
                {!errors?.length && <tr><td colSpan={3} className="px-4 py-6 text-center text-ink-400">No errors. ✨</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <h2 className="mb-3 text-xs uppercase tracking-widest text-ink-400">Recent jobs</h2>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-widest text-ink-400">
                <tr><th className="px-4 py-2 text-left">When</th><th className="px-4 py-2 text-left">Job</th><th className="px-4 py-2 text-left">Status</th><th className="px-4 py-2 text-right">ms</th></tr>
              </thead>
              <tbody>
                {(jobs ?? []).map((j: any) => (
                  <tr key={j.id} className="border-t border-white/5">
                    <td className="px-4 py-2 text-xs text-ink-400">{new Date(j.created_at).toLocaleString()}</td>
                    <td className="px-4 py-2 text-xs">{j.job_name}</td>
                    <td className="px-4 py-2"><span className={`chip ${j.status === 'ok' ? 'text-gleam' : 'text-red-400'}`}>{j.status}</span></td>
                    <td className="px-4 py-2 text-right text-xs text-ink-500">{j.duration_ms ?? '—'}</td>
                  </tr>
                ))}
                {!jobs?.length && <tr><td colSpan={4} className="px-4 py-6 text-center text-ink-400">No job runs yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
