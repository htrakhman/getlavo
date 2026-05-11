import { PageHeader } from '@/components/PortalShell';
import { supabaseServer } from '@/lib/supabase/server';

export default async function AuditPage() {
  const sb = supabaseServer();
  const { data: rows } = await sb
    .from('audit_logs')
    .select('id, action, entity_type, entity_id, actor_role, metadata, created_at, actor:profiles!actor_id(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(200);

  return (
    <>
      <PageHeader eyebrow="Admin" title="Audit log" />
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-widest text-ink-400">
            <tr>
              <th className="px-4 py-2 text-left">When</th>
              <th className="px-4 py-2 text-left">Actor</th>
              <th className="px-4 py-2 text-left">Action</th>
              <th className="px-4 py-2 text-left">Entity</th>
              <th className="px-4 py-2 text-left">Metadata</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((r: any) => (
              <tr key={r.id} className="border-t border-white/5 align-top">
                <td className="px-4 py-3 text-xs text-ink-400 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                <td className="px-4 py-3 text-xs">
                  <div>{r.actor?.full_name ?? '—'}</div>
                  <div className="text-ink-500">{r.actor_role ?? r.actor?.email}</div>
                </td>
                <td className="px-4 py-3"><code className="text-xs text-gleam">{r.action}</code></td>
                <td className="px-4 py-3 text-xs">
                  {r.entity_type ? <span>{r.entity_type}</span> : null}
                  {r.entity_id ? <div className="text-ink-500 font-mono">{r.entity_id.slice(0, 8)}…</div> : null}
                </td>
                <td className="px-4 py-3 text-xs text-ink-300 max-w-xs">
                  <pre className="whitespace-pre-wrap break-words">{r.metadata ? JSON.stringify(r.metadata, null, 0) : ''}</pre>
                </td>
              </tr>
            ))}
            {!rows?.length && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-ink-400">No audit entries yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
