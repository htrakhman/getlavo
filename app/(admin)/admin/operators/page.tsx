import { PageHeader } from '@/components/PortalShell';
import { supabaseServer } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function AdminOperators() {
  const sb = supabaseServer();
  const { data: operators } = await sb
    .from('operators')
    .select('id, name, status, insurance_review_status, insurance_doc_url, insurance_expires_at, owner:profiles!owner_id(email, full_name)')
    .order('created_at', { ascending: false });

  const insuranceLabel = (s: string | null) => {
    if (s === 'approved') return 'verified';
    if (s === 'pending_review') return 'pending review';
    if (s === 'rejected') return 'rejected';
    if (s === 'expired') return 'expired';
    return 'not uploaded';
  };
  const insuranceTone = (s: string | null) => {
    if (s === 'approved') return 'text-gleam';
    if (s === 'pending_review') return 'text-amber-600';
    if (s === 'rejected' || s === 'expired') return 'text-red-400';
    return 'text-ink-400';
  };

  return (
    <>
      <PageHeader eyebrow="Admin" title="Operators" />
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-widest text-ink-400">
            <tr>
              <th className="px-4 py-2 text-left">Business</th>
              <th className="px-4 py-2 text-left">Owner</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Insurance</th>
              <th className="px-4 py-2 text-left">Insurance expiry</th>
            </tr>
          </thead>
          <tbody>
            {(operators ?? []).map((o: any) => (
              <tr key={o.id} className="border-t border-white/5">
                <td className="px-4 py-3"><Link href={`/admin/operators/${o.id}`} className="text-gleam">{o.name}</Link></td>
                <td className="px-4 py-3 text-xs text-ink-400">{o.owner?.email}</td>
                <td className="px-4 py-3"><span className="chip">{o.status.replace('_', ' ')}</span></td>
                <td className="px-4 py-3">
                  <span className={`chip ${insuranceTone(o.insurance_review_status)}`}>
                    {insuranceLabel(o.insurance_review_status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-ink-400">{o.insurance_expires_at ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
