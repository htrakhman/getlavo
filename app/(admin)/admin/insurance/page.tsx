import { PageHeader } from '@/components/PortalShell';
import { supabaseServer } from '@/lib/supabase/server';
import { ReviewActions } from './ReviewActions';

export default async function InsuranceReviewPage() {
  const sb = supabaseServer();
  const { data: pending } = await sb
    .from('operators')
    .select('id, name, insurance_carrier, insurance_expires_at, insurance_doc_url, insurance_uploaded_at, insurance_review_status, insurance_review_note')
    .in('insurance_review_status', ['pending_review', 'rejected'])
    .order('insurance_uploaded_at', { ascending: false });

  return (
    <>
      <PageHeader eyebrow="Admin" title="Insurance review queue" />
      {!pending?.length ? (
        <div className="card p-10 text-center text-ink-400">No certificates awaiting review.</div>
      ) : (
        <div className="space-y-3">
          {pending.map((o: any) => (
            <div key={o.id} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-display text-lg">{o.name}</div>
                  <div className="mt-1 text-xs text-ink-400">
                    Carrier: {o.insurance_carrier ?? '—'}
                    {' · '}Expires: {o.insurance_expires_at ?? '—'}
                    {' · '}Uploaded: {o.insurance_uploaded_at?.slice(0, 10) ?? '—'}
                  </div>
                  <span className={`chip mt-2 inline-block ${o.insurance_review_status === 'rejected' ? 'text-red-400' : 'text-amber-300'}`}>
                    {o.insurance_review_status.replace('_', ' ')}
                  </span>
                  {o.insurance_review_note && <p className="mt-1 text-xs text-ink-400">Last note: {o.insurance_review_note}</p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  {o.insurance_doc_url && (
                    <a href={o.insurance_doc_url} target="_blank" rel="noreferrer" className="btn-quiet text-sm">View certificate</a>
                  )}
                  <ReviewActions operatorId={o.id} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
