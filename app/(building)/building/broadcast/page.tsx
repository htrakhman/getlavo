'use client';

import { useState } from 'react';

export default function BuildingBroadcastPage() {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const [confirming, setConfirming] = useState(false);

  async function send() {
    setConfirming(false);
    const res = await fetch('/api/building/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, body, channels: ['email'] }),
    });
    const d = await res.json();
    const count = d.sent ?? 0;
    setMsg(res.ok ? `Sent to ${count} ${count === 1 ? 'resident' : 'residents'} with email on file.` : (d.error || 'Could not send'));
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-10 space-y-4">
      <h1 className="font-display text-3xl">Broadcast</h1>
      <div>
        <label className="label">Subject</label>
        <input className="field" placeholder="e.g. Reminder: wash day tomorrow" value={subject} onChange={(e) => setSubject(e.target.value)} />
      </div>
      <div>
        <label className="label">Message</label>
        <textarea className="field min-h-[140px]" placeholder="Write your message to residents…" value={body} onChange={(e) => setBody(e.target.value)} />
      </div>
      {confirming ? (
        <div className="card p-4 space-y-3 border-amber-500/30">
          <p className="text-sm text-amber-300">Are you sure? This will email all signed-up residents.</p>
          <div className="flex gap-2">
            <button type="button" className="btn-primary text-sm" onClick={send}>Yes, send now</button>
            <button type="button" className="btn-quiet text-sm" onClick={() => setConfirming(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn-primary" disabled={!subject || !body} onClick={() => setConfirming(true)}>
          Send email to signed-up residents
        </button>
      )}
      {msg && <p className="text-sm text-gleam">{msg}</p>}
    </main>
  );
}
