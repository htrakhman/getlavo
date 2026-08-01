import { PageHeader } from '@/components/PortalShell';
import { supabaseServer } from '@/lib/supabase/server';
import { insuranceDocViewUrl } from '@/lib/insurance-doc';
import { sweepInsuranceAutoVerify } from '@/lib/insurance-auto-verify';
import { INSURANCE_REVIEW_HOLD_MINUTES } from '@/lib/insurance';
import { ReviewActions } from './ReviewActions';

const NEEDS_REVIEW = ['pending_review', 'rejected', 'expired'];

export const dynamic = 'force-dynamic';

export default async function InsuranceReviewPage() {
  // Certificates verify themselves once the hold elapses; clear the due ones
  // before reading so the queue shows what is genuinely still open.
  await sweepInsuranceAutoVerify();

  const sb = supabaseServer();
  // Every operator that has ever uploaded a certificate, so approved policies
  // stay reachable instead of disappearing from the queue once reviewed.
  const { data: rows } = await sb
    .from('operators')
    .select('id, name, insurance_carrier, insurance_policy_number, insurance_coverage_amount_cents, insurance_expires_at, insurance_doc_url, insurance_uploaded_at, insurance_review_status, insurance_review_note')
    .not('insurance_doc_url', 'is', null)
    .order('insurance_uploaded_at', { ascending: false });

  const all = await Promise.all(
    (rows ?? []).map(async (o: any) => ({ ...o, docViewUrl: await insuranceDocViewUrl(o.insurance_doc_url) }))
  );
  const pending = all.filter((o: any) => NEEDS_REVIEW.includes(o.insurance_review_status));
  const reviewed = all.filter((o: any) => !NEEDS_REVIEW.includes(o.insurance_review_status));

  return (
    <>
      <PageHeader eyebrow="Admin" title="Insurance review queue" />
      <p className="-mt-4 mb-6 text-sm text-ink-400">
        Certificates verify automatically {INSURANCE_REVIEW_HOLD_MINUTES} minutes after upload. Anything
        below is inside that window or was taken out of it — reject to pull a certificate back.
      </p>
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
                    {o.insurance_policy_number && <>{' · '}Policy: {o.insurance_policy_number}</>}
                    {o.insurance_coverage_amount_cents && (
                      <>{' · '}Coverage: ${Math.round(o.insurance_coverage_amount_cents / 100).toLocaleString()}</>
                    )}
                    {' · '}Expires: {o.insurance_expires_at ?? '—'}
                    {' · '}Uploaded: {o.insurance_uploaded_at?.slice(0, 10) ?? '—'}
                  </div>
                  <span className={`chip mt-2 inline-block ${['rejected', 'expired'].includes(o.insurance_review_status) ? 'text-red-400' : 'text-amber-600'}`}>
                    {o.insurance_review_status.replace('_', ' ')}
                  </span>
                  {o.insurance_review_note && <p className="mt-1 text-xs text-ink-400">Last note: {o.insurance_review_note}</p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  {o.docViewUrl && (
                    <a href={o.docViewUrl} target="_blank" rel="noreferrer" className="btn-quiet text-sm">View certificate</a>
                  )}
                  <ReviewActions operatorId={o.id} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {reviewed.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 font-display text-lg">All certificates on file</h2>
          <div className="space-y-3">
            {reviewed.map((o: any) => (
              <div key={o.id} className="card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-display text-lg">{o.name}</div>
                    <div className="mt-1 text-xs text-ink-400">
                      Carrier: {o.insurance_carrier ?? '—'}
                      {o.insurance_policy_number && <>{' · '}Policy: {o.insurance_policy_number}</>}
                      {o.insurance_coverage_amount_cents && (
                        <>{' · '}Coverage: ${Math.round(o.insurance_coverage_amount_cents / 100).toLocaleString()}</>
                      )}
                      {' · '}Expires: {o.insurance_expires_at ?? '—'}
                      {' · '}Uploaded: {o.insurance_uploaded_at?.slice(0, 10) ?? '—'}
                    </div>
                    <span className="chip mt-2 inline-block text-gleam">
                      {String(o.insurance_review_status ?? 'unknown').replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {o.docViewUrl && (
                      <a href={o.docViewUrl} target="_blank" rel="noreferrer" className="btn-quiet text-sm">View certificate</a>
                    )}
                    <ReviewActions operatorId={o.id} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
