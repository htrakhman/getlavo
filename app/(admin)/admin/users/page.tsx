import { PageHeader } from '@/components/PortalShell';
import { supabaseServer } from '@/lib/supabase/server';
import { ImpersonateButton } from './ImpersonateButton';

export default async function AdminUsers() {
  const sb = supabaseServer();
  const { data: users } = await sb
    .from('profiles')
    .select('id, email, full_name, role, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  return (
    <>
      <PageHeader eyebrow="Admin" title="Users" />
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-widest text-ink-400">
            <tr>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-left">Role</th>
              <th className="px-4 py-2 text-left">Created</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(users ?? []).map((u: any) => (
              <tr key={u.id} id={u.id} className="border-t border-white/5">
                <td className="px-4 py-3">{u.full_name}</td>
                <td className="px-4 py-3 text-xs">{u.email}</td>
                <td className="px-4 py-3"><span className="chip">{u.role ?? '—'}</span></td>
                <td className="px-4 py-3 text-xs text-ink-400">{u.created_at?.slice(0, 10)}</td>
                <td className="px-4 py-3 text-right">
                  <ImpersonateButton userId={u.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
