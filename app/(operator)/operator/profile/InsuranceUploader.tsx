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
    setBusy(true);
    setErr(null);
    const sb = supabaseBrowser();

    let docUrl = op.insurance_doc_url;
    if (file) {
      const path = `${op.id}/${Date.now()}-${file.name}`;
      const { error } = await sb.storage.from('insurance-docs').upload(path, file, { upsert: true });
      if (error) { setErr(error.message); setBusy(false); return; }
      const { data: { publicUrl } } = sb.storage.from('insurance-docs').getPublicUrl(path);
      docUrl = publicUrl;
    }

    await sb.from('operators').update({
      insurance_carrier: carrier || null,
      insurance_expires_at: expires || null,
      insurance_doc_url: docUrl,
      insurance_uploaded_at: file ? new Date().toISOString() : op.insurance_uploaded_at,
      insurance_review_status: file ? 'pending_review' : op.insurance_review_status,
    }).eq('id', op.id);

    setBusy(false);
    router.refresh();
  }

  return (
    <div>
      {op.insurance_review_status === 'pending_review' && (
        <div className="card border-amber-400/30 bg-amber-400/5 mb-3 p-3 text-xs text-amber-200">
          Pending review — Lavo admin verifies certificates within 24 hours.
        </div>
      )}
      {op.insurance_review_status === 'rejected' && (
        <div className="card border-red-500/30 bg-red-500/5 mb-3 p-3 text-xs text-red-300">
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
