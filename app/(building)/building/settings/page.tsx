import { PageHeader } from '@/components/PortalShell';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { BuildingSettingsForm } from './BuildingSettingsForm';

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
    </>
  );
}
