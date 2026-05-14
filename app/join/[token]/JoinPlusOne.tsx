'use client';

import { useState } from 'react';

export function JoinPlusOne({ buildingCandidateKey, buildingId }: { buildingCandidateKey: string; buildingId: string | null }) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  async function submit() {
    setMsg(null);
    const res = await fetch('/api/building-waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        buildingCandidateKey,
        buildingId,
        email,
        phone,
        fullName: name,
      }),
    });
    if (res.ok) setMsg('You are on the list. We will text and email you when Lavo goes live here.');
    else setMsg('Something went wrong. Try again.');
  }

  return (
    <div className="card space-y-4 p-6">
      <div className="text-xs uppercase tracking-widest text-ink-500">Plus one this request</div>
      <input
        className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm text-ink-100 outline-none ring-gleam/40 focus:ring-2"
        placeholder="Name (optional)"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm text-ink-100 outline-none ring-gleam/40 focus:ring-2"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm text-ink-100 outline-none ring-gleam/40 focus:ring-2"
        placeholder="Phone (optional)"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <button type="button" className="btn-primary w-full py-3 text-sm" onClick={() => submit()}>
        +1 me
      </button>
      {msg && <p className="text-sm text-gleam">{msg}</p>}
    </div>
  );
}
