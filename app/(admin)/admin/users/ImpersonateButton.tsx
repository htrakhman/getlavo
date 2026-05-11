'use client';
import { useState } from 'react';

export function ImpersonateButton({ userId }: { userId: string }) {
  const [busy, setBusy] = useState(false);

  async function impersonate() {
    if (!confirm('Open this user\'s account in a new tab? This will sign you out of admin and into them.')) return;
    setBusy(true);
    const res = await fetch('/api/admin/impersonate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    setBusy(false);
    const data = await res.json();
    if (data.url) window.open(data.url, '_blank');
    else alert(data.error ?? 'Failed');
  }

  return (
    <button onClick={impersonate} disabled={busy} className="text-xs text-gleam hover:underline">
      {busy ? '…' : 'Impersonate'}
    </button>
  );
}
