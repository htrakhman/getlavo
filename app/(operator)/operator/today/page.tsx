import { PageHeader } from '@/components/PortalShell';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { money } from '@/lib/format';

export default async function OperatorTodayPage() {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  const sb = supabaseServer();
  const { data: op } = await sb.from('operators').select('id, name').eq('owner_id', session.user.id).maybeSingle();
  if (!op) redirect('/operator/onboarding');

  const today = new Date().toISOString().slice(0, 10);
  const { data: bookings } = await sb
    .from('bookings')
    .select(
      'id, scheduled_for, time_slot, status, gross_cents, building:buildings(name), vehicle:vehicles(make, model, color, license_plate), resident:residents(unit_number, spot_label, vehicle_access_method, vehicle_access_notes)',
    )
    .eq('operator_id', op.id)
    .eq('scheduled_for', today)
    .order('time_slot', { ascending: true });

  return (
    <>
      <PageHeader eyebrow="Crew" title={`Today · ${today}`} />
      <div className="space-y-3">
        {(bookings ?? []).length === 0 && <p className="text-sm text-ink-500">No bookings scheduled for today.</p>}
        {(bookings ?? []).map((b: any) => (
          <div key={b.id} className="card p-4 text-sm">
            <div className="flex justify-between gap-3">
              <div>
                <div className="font-medium">{b.building?.name}</div>
                <div className="text-ink-400">Unit {b.resident?.unit_number ?? '—'}</div>
                <div className="text-xs text-ink-500 mt-1">
                  {b.vehicle?.color} {b.vehicle?.make} {b.vehicle?.model} · {b.vehicle?.license_plate}
                </div>
                <div className="text-xs text-ink-500">Spot: {b.resident?.spot_label ?? '—'}</div>
                <div className="text-xs text-ink-500">Access: {b.resident?.vehicle_access_method ?? '—'}</div>
                {b.resident?.vehicle_access_notes && (
                  <div className="text-xs text-ink-400 mt-1">{b.resident.vehicle_access_notes}</div>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className="text-gleam font-display">{money(b.gross_cents)}</div>
                <div className="text-xs text-ink-500">{b.time_slot}</div>
                <div className="text-xs uppercase text-ink-500">{b.status}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
