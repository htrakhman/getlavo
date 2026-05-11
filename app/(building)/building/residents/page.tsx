import { PageHeader } from '@/components/PortalShell';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { InviteResidents } from './InviteResidents';

export default async function Residents() {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  const sb = supabaseServer();
  const { getCurrentBuildingForSession } = await import('@/lib/building');
  const { current: building } = await getCurrentBuildingForSession(session.user.id);
  if (!building) redirect('/building/onboarding');

  const [{ data: residents }, { data: invites }] = await Promise.all([
    sb.from('residents')
      .select('id, unit_number, profile:profiles(full_name, email), vehicles(*)')
      .eq('building_id', building.id),
    sb.from('building_invites')
      .select('id, email, full_name, unit_number, status, sent_at, accepted_at')
      .eq('building_id', building.id)
      .order('sent_at', { ascending: false })
      .limit(50),
  ]);

  const enrolledEmails = new Set((residents ?? []).map((r: any) => r.profile?.email).filter(Boolean));
  const pendingInvites = (invites ?? []).filter((i: any) => !enrolledEmails.has(i.email));

  return (
    <>
      <PageHeader
        eyebrow={building.name}
        title="Residents"
        action={<InviteResidents buildingSlug={building.slug ?? ''} />}
      />

      <div className="card overflow-hidden mb-8">
        <div className="border-b border-white/5 px-5 py-3 text-xs uppercase tracking-widest text-ink-400">
          Enrolled · {residents?.length ?? 0}
        </div>
        <table className="w-full text-sm">
          <thead className="border-b border-white/5 text-left text-xs uppercase tracking-widest text-ink-400">
            <tr>
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Unit</th>
              <th className="px-5 py-3">Vehicle</th>
              <th className="px-5 py-3">Plate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {(residents ?? []).map((r: any) => (
              <tr key={r.id} className="hover:bg-white/5">
                <td className="px-5 py-3">{r.profile?.full_name}</td>
                <td className="px-5 py-3">{r.unit_number}</td>
                <td className="px-5 py-3">{r.vehicles?.[0] ? `${r.vehicles[0].color} ${r.vehicles[0].make} ${r.vehicles[0].model}` : '—'}</td>
                <td className="px-5 py-3 font-mono text-xs">{r.vehicles?.[0]?.license_plate ?? '—'}</td>
              </tr>
            ))}
            {!residents?.length && (
              <tr><td colSpan={4} className="px-5 py-10 text-center text-ink-400">No residents enrolled yet — invite some.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {pendingInvites.length > 0 && (
        <div className="card overflow-hidden">
          <div className="border-b border-white/5 px-5 py-3 text-xs uppercase tracking-widest text-ink-400">
            Pending invites · {pendingInvites.length}
          </div>
          <table className="w-full text-sm">
            <thead className="border-b border-white/5 text-left text-xs uppercase tracking-widest text-ink-400">
              <tr>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Unit</th>
                <th className="px-5 py-3">Sent</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {pendingInvites.map((i: any) => (
                <tr key={i.id} className="hover:bg-white/5">
                  <td className="px-5 py-3">{i.email}</td>
                  <td className="px-5 py-3">{i.full_name ?? '—'}</td>
                  <td className="px-5 py-3">{i.unit_number ?? '—'}</td>
                  <td className="px-5 py-3 text-xs text-ink-400">{i.sent_at?.slice(0, 10)}</td>
                  <td className="px-5 py-3"><span className="chip">{i.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
