import { PageHeader } from '@/components/PortalShell';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function ResidentAnnouncementsPage() {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  const sb = supabaseServer();

  const { data: resident } = await sb
    .from('residents')
    .select('building_id, building:buildings(name)')
    .eq('profile_id', session.user.id)
    .maybeSingle();
  if (!resident) redirect('/resident/onboarding');

  const { data: announcements } = await sb
    .from('announcements')
    .select('id, subject, body, created_at, author:profiles!author_id(full_name)')
    .eq('building_id', resident.building_id)
    .order('created_at', { ascending: false })
    .limit(50);

  const buildingName = (resident.building as any)?.name;

  return (
    <>
      <PageHeader eyebrow={buildingName} title="Announcements" />
      {!announcements?.length ? (
        <div className="card p-10 text-center text-ink-400">
          No announcements from your property manager yet.
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((a: any) => (
            <article key={a.id} className="card p-5">
              <div className="font-display text-lg">{a.subject}</div>
              <div className="mt-1 text-xs text-ink-500">
                {new Date(a.created_at).toLocaleString()}
                {a.author?.full_name ? ` · ${a.author.full_name}` : ''}
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-ink-200">{a.body}</p>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
