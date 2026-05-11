'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ComposeAnnouncement({ buildingId, buildingName, residentCount }: { buildingId: string; buildingName: string; residentCount: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function send() {
    setBusy(true);
    setErr(null);
    const res = await fetch('/api/building/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buildingId, subject, body }),
    });
    setBusy(false);
    if (!res.ok) { setErr('Could not send'); return; }
    setOpen(false);
    setSubject('');
    setBody('');
    router.refresh();
  }

  if (!open) return <button onClick={() => setOpen(true)} className="btn-primary">Send announcement</button>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
      <div className="card w-full max-w-lg p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-display text-xl">New announcement</h3>
            <p className="mt-1 text-xs text-ink-500">Sends an email + in-app notification to {residentCount} enrolled resident{residentCount === 1 ? '' : 's'} at {buildingName}.</p>
          </div>
          <button onClick={() => setOpen(false)} className="text-ink-400 hover:text-ink-100">✕</button>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label className="label">Subject</label>
            <input className="field" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Wash day moved this week" />
          </div>
          <div>
            <label className="label">Message</label>
            <textarea className="field min-h-32" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Hi everyone — a quick heads up…" />
          </div>
        </div>

        {err && <div className="mt-3 text-sm text-red-400">{err}</div>}

        <div className="mt-6 flex gap-2">
          <button onClick={send} disabled={busy || !subject.trim() || !body.trim()} className="btn-primary">
            {busy ? 'Sending…' : `Send to ${residentCount}`}
          </button>
          <button onClick={() => setOpen(false)} className="btn-quiet">Cancel</button>
        </div>
      </div>
    </div>
  );
}
