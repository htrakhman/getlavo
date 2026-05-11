import { PageHeader } from '@/components/PortalShell';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getCurrentBuildingForSession } from '@/lib/building';
import { ComposeAnnouncement } from './ComposeAnnouncement';

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
    <>
      <PageHeader
        eyebrow={building.name}
        title="Announcements"
        action={<ComposeAnnouncement buildingId={building.id} buildingName={building.name} residentCount={residentCount ?? 0} />}
      />

      {!announcements?.length ? (
        <div className="card p-10 text-center text-ink-400">
          No announcements yet. Send your first one to let residents know wash days are coming.
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((a: any) => (
            <div key={a.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-display text-lg">{a.subject}</div>
                  <div className="mt-1 text-xs text-ink-400">
                    {new Date(a.created_at).toLocaleString()} · sent to {a.sent_count} resident{a.sent_count === 1 ? '' : 's'} · by {a.author?.full_name ?? '—'}
                  </div>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-ink-200">{a.body}</p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
