import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getCurrentBuildingForSession } from '@/lib/building';
import { AnnouncementsView } from './AnnouncementsView';

export default async function AnnouncementsPage() {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  const { current: building } = await getCurrentBuildingForSession(session.user.id);
  if (!building) redirect('/building/onboarding');

  const sb = supabaseServer();
  const [{ data: announcements }, { count: residentCount }] = await Promise.all([
    sb.from('announcements')
      .select('id, subject, body, sent_count, created_at, author:profiles!author_id(full_name)')
      .eq('building_id', building.id)
      .order('created_at', { ascending: false })
      .limit(50),
    sb.from('residents')
      .select('*', { count: 'exact', head: true })
      .eq('building_id', building.id),
  ]);

  return (
    <AnnouncementsView
      buildingId={building.id}
      buildingName={building.name}
      residentCount={residentCount ?? 0}
      initialAnnouncements={(announcements ?? []) as any}
    />
  );
}
