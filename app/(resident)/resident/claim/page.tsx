'use client';

import { useState } from 'react';

export default function ResidentClaimPage() {
  const [category, setCategory] = useState('damage');
  const [description, setDescription] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setMsg(null);
    const res = await fetch('/api/resident-claims', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, description, bookingId: bookingId || undefined, photoUrls: [] }),
    });
    setBusy(false);
    if (res.ok) setMsg('We received your claim. Support will respond within five business days.');
    else setMsg('Could not submit. Try again or email hello@getlavo.io');
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-10">
      <h1 className="font-display text-3xl">File a claim</h1>
      <p className="mt-2 text-sm text-ink-400">Damage, missed service, safety concern, or other issue.</p>
      <select className="field mt-6" value={category} onChange={(e) => setCategory(e.target.value)}>
        <option value="damage">Damage</option>
        <option value="missed_service">Missed service</option>
        <option value="rude_crew">Rude crew</option>
        <option value="other">Other</option>
      </select>
      <input className="field mt-3" placeholder="Booking ID (optional)" value={bookingId} onChange={(e) => setBookingId(e.target.value)} />
      <textarea className="field mt-3 min-h-[120px]" placeholder="What happened?" value={description} onChange={(e) => setDescription(e.target.value)} />
      <button type="button" className="btn-primary mt-4 w-full" disabled={busy} onClick={() => submit()}>
        {busy ? 'Sending…' : 'Submit to Lavo support'}
      </button>
      {msg && <p className="mt-4 text-sm text-gleam">{msg}</p>}
    </main>
  );
}
