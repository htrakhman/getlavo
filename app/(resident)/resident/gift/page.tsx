'use client';

import { useState } from 'react';

export default function GiftWashPage() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send() {
    setBusy(true);
    const res = await fetch('/api/gift-wash', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientEmail: email, amountCents: 3500 }),
    });
    const d = await res.json();
    setBusy(false);
    if (d.code) setCode(d.code);
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-10">
      <h1 className="font-display text-3xl">Gift a wash</h1>
      <p className="mt-2 text-sm text-ink-400">We email your neighbor a one-time promo code.</p>
      <input className="field mt-6" placeholder="Neighbor email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <button type="button" className="btn-primary mt-4 w-full" disabled={busy} onClick={() => send()}>
        {busy ? 'Sending…' : 'Create gift code'}
      </button>
      {code && <p className="mt-4 text-sm text-gleam">Code: {code}</p>}
    </main>
  );
}
