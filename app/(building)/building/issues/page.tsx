import { PageHeader } from '@/components/PortalShell';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ReportIssue } from './ReportIssue';

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

  const open = (issues ?? []).filter((i: any) => i.status !== 'resolved');
  const resolved = (issues ?? []).filter((i: any) => i.status === 'resolved');

  return (
    <>
      <PageHeader
        eyebrow={building.name}
        title="Issues"
        action={<ReportIssue buildingId={building.id} />}
      />

      {open.length === 0 && resolved.length === 0 && (
        <div className="card p-10 text-center text-ink-400">
          No issues reported. If something comes up, report it here and Lavo will follow up within 24 hours.
        </div>
      )}

      {open.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs uppercase tracking-widest text-ink-400 mb-3">Open</h2>
          <div className="space-y-3">
            {open.map((i: any) => (
              <IssueCard key={i.id} issue={i} />
            ))}
          </div>
        </div>
      )}

      {resolved.length > 0 && (
        <div>
          <h2 className="text-xs uppercase tracking-widest text-ink-400 mb-3">Resolved</h2>
          <div className="space-y-3">
            {resolved.map((i: any) => (
              <IssueCard key={i.id} issue={i} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function IssueCard({ issue }: { issue: any }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs text-ink-400">{new Date(issue.created_at).toLocaleDateString()} · {issue.type}</div>
          <p className="mt-1 text-sm text-ink-200">{issue.description}</p>
        </div>
        <span className={`chip ${issue.status === 'resolved' ? 'text-gleam' : ''}`}>{issue.status.replace('_', ' ')}</span>
      </div>
    </div>
  );
}
