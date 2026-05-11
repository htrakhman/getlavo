import { PageHeader } from '@/components/PortalShell';
import { supabaseServer, getSessionUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SpotEditor, VehiclesList } from './editors';

export default async function VehiclePage() {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  const sb = supabaseServer();

  const { data: resident } = await sb
    .from('residents')
    .select('id, unit_number, floor_number, spot_label')
    .eq('profile_id', session.user.id)
    .maybeSingle();
  if (!resident) redirect('/resident/onboarding');

  const { data: vehicles } = await sb.from('vehicles').select('*').eq('resident_id', resident.id).order('is_primary', { ascending: false });

  return (
    <>
      <PageHeader eyebrow="Profile" title="Vehicles & spot" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <SpotEditor
          residentId={resident.id}
          unit={resident.unit_number ?? ''}
          floor={resident.floor_number ?? null}
          spotLabel={resident.spot_label ?? ''}
        />
        <VehiclesList residentId={resident.id} vehicles={vehicles ?? []} />
      </div>
    </>
  );
}
