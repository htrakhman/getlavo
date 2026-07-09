'use client';

import { useState } from 'react';

export default function ResidentReferralsPage() {
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function gen() {
    setBusy(true);
    setErr(null);
    const res = await fetch('/api/referrals/create', { method: 'POST' });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !d.url) { setErr(d.error || 'Could not generate link. Please try again.'); return; }
    setUrl(d.url);
  }

  function copy() {
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-10">
      <h1 className="font-display text-3xl">Refer a neighbor</h1>
      <p className="mt-2 text-sm text-ink-400">
        Share Lavo with your neighbors. Send them your personal link and they can sign up and book a wash.
      </p>

      {!url ? (
        <>
          {err && <p className="mt-4 text-sm text-red-400">{err}</p>}
          <button type="button" className="btn-primary mt-6" disabled={busy} onClick={gen}>
            {busy ? 'Creating…' : 'Get my referral link'}
          </button>
        </>
      ) : (
        <div className="mt-6 space-y-3">
          <div className="card p-4 text-sm break-all text-gleam">{url}</div>
          <button type="button" className="btn-quiet text-sm" onClick={copy}>
            {copied ? 'Copied!' : 'Copy link'}
          </button>
        </div>
      )}
    </main>
  );
}
