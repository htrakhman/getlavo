import { PageHeader } from '@/components/PortalShell';
import { supabaseServer, getSessionUser } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { SpotEditor, VehiclesList } from './editors';
import { AccessEditor } from './AccessEditor';

export const dynamic = 'force-dynamic';

export default async function VehiclePage() {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  const sb = supabaseServer();

  const { data: resident, error: residentErr } = await supabaseAdmin()
    .from('residents')
    .select('id, building_id, spot_label, vehicle_access_notes, building:buildings(name)')
    .eq('profile_id', session.user.id)
    .maybeSingle();
  if (residentErr) {
    console.error('vehicle page resident query error:', residentErr.message);
  }
  if (!resident) redirect('/resident/onboarding');

  const [{ data: vehicles }, { data: partnership }] = await Promise.all([
    supabaseAdmin().from('vehicles').select('*').eq('resident_id', resident.id).order('is_primary', { ascending: false }),
    supabaseAdmin()
      .from('partnerships')
      .select('operator:operators(name)')
      .eq('building_id', resident.building_id)
      .eq('status', 'active')
      .maybeSingle(),
  ]);

  const building = resident.building as any;
  const operator = (partnership?.operator as any) ?? null;

  return (
    <>
      <PageHeader eyebrow="Profile" title="Vehicles & parking location" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-widest text-ink-400">Building &amp; operator</div>
              <span className="chip text-ink-400" title="Set by your property manager — residents can't change this">Locked</span>
            </div>
            <div className="mt-2 font-display text-2xl">{building?.name ?? '—'}</div>
            <div className="mt-1 text-sm text-ink-400">
              Operator: <span className={operator ? 'text-ink-200' : 'text-amber-600'}>{operator?.name ?? 'Not assigned yet'}</span>
            </div>
            <p className="mt-3 text-xs text-ink-500">
              Assigned by your property manager. Contact them if this needs to change.
            </p>
          </div>
          <SpotEditor
            residentId={resident.id}
            spotLabel={resident.spot_label ?? ''}
          />
          <AccessEditor
            residentId={resident.id}
            notes={resident.vehicle_access_notes}
          />
        </div>
        <VehiclesList residentId={resident.id} vehicles={vehicles ?? []} />
      </div>
    </>
  );
}
