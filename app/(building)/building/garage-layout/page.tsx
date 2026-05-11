import { PageHeader } from '@/components/PortalShell';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { GarageLayoutEditor } from './GarageLayoutEditor';

export default async function GarageLayoutPage() {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  const sb = supabaseServer();
  const { getCurrentBuildingForSession } = await import('@/lib/building');
  const { current: building } = await getCurrentBuildingForSession(session.user.id);
  if (!building) redirect('/building/onboarding');

  return (
    <>
      <PageHeader eyebrow={building.name} title="Garage layout" />
      <p className="mb-6 max-w-2xl text-sm text-ink-400">
        Define your garage structure so the wash crew can navigate it. The operator sees vehicles grouped by floor on wash day.
      </p>
      <GarageLayoutEditor buildingId={building.id} initial={building.garage_levels_json ?? []} />
    </>
  );
}
