import { PageHeader } from '@/components/PortalShell';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { BuildingSettingsForm } from './BuildingSettingsForm';
import { GarageLayoutEditor } from './GarageLayoutEditor';

export default async function BuildingSettings() {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  const { getCurrentBuildingForSession } = await import('@/lib/building');
  const { current: building } = await getCurrentBuildingForSession(session.user.id);
  if (!building) redirect('/building/onboarding');

  return (
    <>
      <PageHeader eyebrow={building.name} title="Building settings" />
      <BuildingSettingsForm building={building} />

      <div className="mt-12">
        <h2 className="font-display text-2xl">Garage layout</h2>
        <p className="mb-6 mt-2 max-w-2xl text-sm text-ink-400">
          Define your garage structure so the wash crew can navigate it. The operator sees vehicles grouped by floor on wash day.
        </p>
        <GarageLayoutEditor buildingId={building.id} initial={building.garage_levels_json ?? []} />
      </div>
    </>
  );
}
