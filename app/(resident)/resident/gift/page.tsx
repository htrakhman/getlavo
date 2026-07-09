'use client';

import { useState } from 'react';

export default function GiftWashPage() {
  const [email, setEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function send() {
    setBusy(true);
    setErr(null);
    const res = await fetch('/api/gift-wash', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientEmail: email, recipientName, amountCents: 3500 }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setErr(d.error || 'Could not send gift. Please try again.'); return; }
    setDone(true);
  }

  if (done) {
    return (
      <main className="mx-auto max-w-lg px-6 py-10">
        <div className="rounded-2xl border border-gleam/30 bg-gleam/10 p-8 text-center">
          <div className="text-4xl mb-4">🎁</div>
          <h2 className="font-display text-2xl text-gleam">Gift sent!</h2>
          <p className="mt-2 text-sm text-ink-300">
            We emailed a promo code to <strong>{email}</strong>. They can use it on their next wash.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-10">
      <h1 className="font-display text-3xl">Gift a wash</h1>
      <p className="mt-2 text-sm text-ink-400">
        We'll email your neighbor a one-time promo code worth $35 toward any Lavo wash.
      </p>
      <div className="mt-6 space-y-3">
        <div>
          <label className="label">Recipient name</label>
          <input
            className="field"
            placeholder="Jane Smith"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Recipient email</label>
          <input
            className="field"
            type="email"
            placeholder="neighbor@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>
      {err && <p className="mt-3 text-sm text-red-400">{err}</p>}
      <button
        type="button"
        className="btn-primary mt-5 w-full"
        disabled={busy || !email || !recipientName}
        onClick={send}
      >
        {busy ? 'Sending…' : 'Send gift →'}
      </button>
    </main>
  );
}
