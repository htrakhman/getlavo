import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { IssuesView } from './IssuesView';

export default async function IssuesPage() {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  const { getCurrentBuildingForSession } = await import('@/lib/building');
  const { current: building } = await getCurrentBuildingForSession(session.user.id);
  if (!building) redirect('/building/onboarding');
  const sb = supabaseServer();

  const { data: issues } = await sb
    .from('issues')
    .select('*')
    .eq('building_id', building.id)
    .order('created_at', { ascending: false });

  return (
    <IssuesView
      buildingId={building.id}
      buildingName={building.name}
      initialIssues={(issues ?? []) as any}
    />
  );
}
