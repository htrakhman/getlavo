import { PageHeader } from '@/components/PortalShell';
import { supabaseServer } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function AdminBuildings() {
  const sb = supabaseServer();
  const { data: buildings } = await sb
    .from('buildings')
    .select('id, name, city, status, created_at, manager:profiles!manager_id(email)')
    .order('created_at', { ascending: false });

  return (
    <>
      <PageHeader eyebrow="Admin" title="Buildings" />
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-widest text-ink-400">
            <tr>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">City</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Manager</th>
              <th className="px-4 py-2 text-left">Created</th>
            </tr>
          </thead>
          <tbody>
            {(buildings ?? []).map((b: any) => (
              <tr key={b.id} className="border-t border-white/5">
                <td className="px-4 py-3"><Link href={`/admin/buildings/${b.id}`} className="text-gleam">{b.name}</Link></td>
                <td className="px-4 py-3">{b.city}</td>
                <td className="px-4 py-3"><span className="chip">{b.status}</span></td>
                <td className="px-4 py-3 text-xs text-ink-400">{b.manager?.email}</td>
                <td className="px-4 py-3 text-xs text-ink-400">{b.created_at?.slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
