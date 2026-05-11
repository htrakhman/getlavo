import { PageHeader } from '@/components/PortalShell';
import { supabaseServer } from '@/lib/supabase/server';

export default async function AdminWashDays() {
  const sb = supabaseServer();
  const { data: days } = await sb
    .from('wash_days')
    .select('id, scheduled_for, started_at, completed_at, building:buildings(name), operator:operators(name)')
    .order('scheduled_for', { ascending: false })
    .limit(50);

  return (
    <>
      <PageHeader eyebrow="Admin" title="Wash days" />
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-widest text-ink-400">
            <tr>
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-left">Building</th>
              <th className="px-4 py-2 text-left">Operator</th>
              <th className="px-4 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {(days ?? []).map((d: any) => (
              <tr key={d.id} className="border-t border-white/5">
                <td className="px-4 py-3">{d.scheduled_for}</td>
                <td className="px-4 py-3">{d.building?.name}</td>
                <td className="px-4 py-3">{d.operator?.name ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className="chip">{d.completed_at ? 'completed' : d.started_at ? 'in progress' : 'scheduled'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
