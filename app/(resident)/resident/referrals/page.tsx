'use client';

import { useState } from 'react';

export default function ResidentReferralsPage() {
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function gen() {
    setBusy(true);
    const res = await fetch('/api/referrals/create', { method: 'POST' });
    const d = await res.json();
    setBusy(false);
    if (d.url) setUrl(d.url);
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-10">
      <h1 className="font-display text-3xl">Refer a neighbor</h1>
      <p className="mt-2 text-sm text-ink-400">You each get $10 in credit when they complete a first paid wash.</p>
      <button type="button" className="btn-primary mt-6" disabled={busy} onClick={() => gen()}>
        {busy ? 'Creating…' : 'Create my referral link'}
      </button>
      {url && (
        <div className="mt-6 card p-4 text-sm break-all text-gleam">
          {url}
        </div>
      )}
    </main>
  );
}
