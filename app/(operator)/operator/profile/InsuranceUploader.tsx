'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

export function InsuranceUploader({ op }: { op: any }) {
  const router = useRouter();
  const [carrier, setCarrier] = useState(op.insurance_carrier ?? '');
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

    const res = await fetch('/api/operator/insurance', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ carrier, expiresAt: expires, docUrl, fileUploaded: !!file }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setErr(body.error ?? 'Failed to save insurance info');
      setBusy(false);
      return;
    }

    setBusy(false);
    router.refresh();
  }

  return (
    <div>
      {op.insurance_review_status === 'rejected' && (
        <div className="card border-red-500/30 bg-red-500/5 mb-3 p-3 text-xs text-red-500">
          Rejected: {op.insurance_review_note ?? 'see admin notes'}. Upload a new certificate.
        </div>
      )}
      {op.insurance_review_status === 'approved' && (
        <div className="text-xs text-gleam mb-3">✓ Verified</div>
      )}
      {op.insurance_doc_url ? (
        <div className="text-sm text-ink-300 mb-3">
          Carrier: <span className="text-ink-100">{op.insurance_carrier ?? '—'}</span>
          {op.insurance_expires_at && <> · Expires {op.insurance_expires_at}</>}
          {' · '}
          <a href={op.insurance_doc_url} target="_blank" rel="noreferrer" className="text-gleam">View certificate</a>
        </div>
      ) : (
        <div className="text-sm text-ink-400 mb-3">
          Upload your insurance certificate. Providers must carry active general liability insurance.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <label className="label">Carrier</label>
          <input className="field" value={carrier} onChange={(e) => setCarrier(e.target.value)} />
        </div>
        <div>
          <label className="label">Expiry</label>
          <input className="field" type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
        </div>
        <div>
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
