'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

export function InsuranceUploader({ op, docViewUrl }: { op: any; docViewUrl?: string | null }) {
  const router = useRouter();
  const [carrier, setCarrier] = useState(op.insurance_carrier ?? '');
  const [policyNumber, setPolicyNumber] = useState(op.insurance_policy_number ?? '');
  const [coverage, setCoverage] = useState(
    op.insurance_coverage_amount_cents ? String(op.insurance_coverage_amount_cents / 100) : ''
  );
  const [expires, setExpires] = useState(op.insurance_expires_at ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setErr(null);
    if (!file && !op.insurance_doc_url) {
      setErr('Upload your certificate of insurance (PDF or image) to get verified.');
      return;
    }
    if (!carrier.trim()) {
      setErr('Add your insurance provider.');
      return;
    }
    if (!expires) {
      setErr('Add the policy expiration date.');
      return;
    }
    setBusy(true);
    const sb = supabaseBrowser();

    let docUrl = op.insurance_doc_url;
    if (file) {
      const path = `${op.id}/${Date.now()}-${file.name}`;
      const { error } = await sb.storage.from('insurance-docs').upload(path, file, { upsert: true });
      if (error) { setErr(error.message); setBusy(false); return; }
      const { data: { publicUrl } } = sb.storage.from('insurance-docs').getPublicUrl(path);
      docUrl = publicUrl;
    }

    const coverageNum = parseFloat(coverage);
    const res = await fetch('/api/operator/insurance', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        carrier,
        policyNumber: policyNumber.trim() || null,
        coverageAmount: Number.isFinite(coverageNum) && coverageNum > 0 ? coverageNum : null,
        expiresAt: expires,
        docUrl,
        fileUploaded: !!file,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setErr(body.error ?? 'Failed to save insurance info');
      setBusy(false);
      return;
    }

    setBusy(false);
    setFile(null);
    router.refresh();
  }

  const viewUrl = docViewUrl ?? op.insurance_doc_url;

  return (
    <div>
      {op.insurance_review_status === 'rejected' && (
        <div className="card border-red-500/30 bg-red-500/5 mb-3 p-3 text-xs text-red-500">
          Rejected: {op.insurance_review_note ?? 'see admin notes'}. Upload a new certificate.
        </div>
      )}
      {op.insurance_review_status === 'expired' && (
        <div className="card border-red-500/30 bg-red-500/5 mb-3 p-3 text-xs text-red-500">
          Your policy on file has expired. Upload a current certificate to get verified again.
        </div>
      )}
      {op.insurance_review_status === 'pending_review' && (
        <div className="card border-amber-500/30 bg-amber-500/5 mb-3 p-3 text-xs text-amber-600">
          Certificate under review. We will let you know once it is verified.
        </div>
      )}
      {op.insurance_review_status === 'approved' && (
        <div className="text-xs text-gleam mb-3">✓ Verified</div>
      )}
      {op.insurance_doc_url ? (
        <div className="text-sm text-ink-300 mb-3">
          Carrier: <span className="text-ink-100">{op.insurance_carrier ?? '—'}</span>
          {op.insurance_policy_number && <> · Policy {op.insurance_policy_number}</>}
          {op.insurance_coverage_amount_cents && (
            <> · Coverage ${Math.round(op.insurance_coverage_amount_cents / 100).toLocaleString()}</>
          )}
          {op.insurance_expires_at && <> · Expires {op.insurance_expires_at}</>}
          {viewUrl && (
            <>
              {' · '}
              <a href={viewUrl} target="_blank" rel="noreferrer" className="text-gleam">View certificate</a>
            </>
          )}
        </div>
      ) : (
        <div className="text-sm text-ink-400 mb-3">
          Upload your insurance certificate. Providers must carry active general liability insurance.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <label className="label">Provider</label>
          <input className="field" value={carrier} onChange={(e) => setCarrier(e.target.value)} />
        </div>
        <div>
          <label className="label">Policy number <span className="text-ink-500">(optional)</span></label>
          <input className="field" value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)} />
        </div>
        <div>
          <label className="label">Coverage amount ($)</label>
          <input
            className="field"
            type="number"
            min="0"
            step="1000"
            placeholder="1000000"
            value={coverage}
            onChange={(e) => setCoverage(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Expiry</label>
          <input className="field" type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="label">Certificate (PDF or image)</label>
          <input className="field !p-2 text-sm" type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
      </div>

      {err && <div className="mt-2 text-sm text-red-400">{err}</div>}

      <div className="mt-4">
        <button onClick={save} disabled={busy} className="btn-primary text-sm">
          {busy ? 'Saving…' : op.insurance_doc_url ? 'Update' : 'Save'}
        </button>
      </div>
    </div>
  );
}
