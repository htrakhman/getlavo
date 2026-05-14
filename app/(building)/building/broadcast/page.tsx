'use client';

import { useState } from 'react';

export default function BuildingBroadcastPage() {
  const [subject, setSubject] = useState('Reminder: Lavo wash day tomorrow');
  const [body, setBody] = useState('Park in your usual spot. Operators arrive between 9 AM and 3 PM. Reply with questions.');
  const [msg, setMsg] = useState<string | null>(null);

  async function send() {
    const res = await fetch('/api/building/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, body, channels: ['email'] }),
    });
    const d = await res.json();
    setMsg(res.ok ? `Queued for ${d.sent ?? 0} residents with email on file.` : 'Could not send');
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-10 space-y-4">
      <h1 className="font-display text-3xl">Broadcast</h1>
      <input className="field" value={subject} onChange={(e) => setSubject(e.target.value)} />
      <textarea className="field min-h-[140px]" value={body} onChange={(e) => setBody(e.target.value)} />
      <button type="button" className="btn-primary" onClick={() => send()}>
        Send email to signed-up residents
      </button>
      {msg && <p className="text-sm text-gleam">{msg}</p>}
    </main>
  );
}
