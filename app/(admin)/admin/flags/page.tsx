import { PageHeader } from '@/components/PortalShell';
import { supabaseServer } from '@/lib/supabase/server';

export default async function AdminFlagsPage() {
  const sb = supabaseServer();
  const { data: flagged } = await sb
    .from('washes')
    .select(`
      id, status, flag_reason, crew_notes, completed_at,
      wash_day:wash_days(scheduled_for, building:buildings(name), operator:operators(name)),
      resident:residents(unit_number, profile:profiles(full_name, email))
    `)
    .eq('status', 'flagged')
    .order('completed_at', { ascending: false, nullsFirst: false })
    .limit(100);

  return (
    <>
      <PageHeader eyebrow="Admin" title="Flagged washes" />
      {!flagged?.length ? (
        <div className="card p-10 text-center text-ink-400">No flagged washes. ✨</div>
      ) : (
        <div className="space-y-3">
          {flagged.map((w: any) => (
            <div key={w.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-ink-400">
                    {w.wash_day?.scheduled_for} · {w.wash_day?.building?.name} · {w.wash_day?.operator?.name}
                  </div>
                  <div className="mt-1 font-medium">
                    {w.resident?.profile?.full_name ?? 'Resident'} · Unit {w.resident?.unit_number}
                  </div>
                  <div className="mt-2 text-sm">
                    <span className="text-amber-300">⚑ {w.flag_reason ?? '—'}</span>
                  </div>
                  {w.crew_notes && <p className="mt-1 text-xs text-ink-400">Notes: {w.crew_notes}</p>}
                </div>
                <div className="text-right text-xs text-ink-500">{w.resident?.profile?.email}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
