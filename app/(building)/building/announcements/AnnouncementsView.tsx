'use client';
import { useState } from 'react';

type Announcement = {
  id: string;
  subject: string;
  body: string;
  sent_count: number;
  created_at: string;
  author: { full_name: string } | null;
};

export function AnnouncementsView({
  buildingId,
  buildingName,
  residentCount,
  initialAnnouncements,
}: {
  buildingId: string;
  buildingName: string;
  residentCount: number;
  initialAnnouncements: Announcement[];
}) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState(initialAnnouncements);

  async function send() {
    setBusy(true);
    setErr(null);
    const res = await fetch('/api/building/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buildingId, subject, body }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setErr('Could not send'); return; }
    setOpen(false);
    setSubject('');
    setBody('');
    setAnnouncements((prev) => [{
      id: data.announcementId,
      subject,
      body,
      sent_count: residentCount,
      created_at: new Date().toISOString(),
      author: null,
    }, ...prev]);
  }

  return (
    <>
      <div className="mb-8 flex items-end justify-between gap-6">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-gleam">{buildingName}</div>
          <h1 className="mt-1 font-display text-4xl tracking-tight">Announcements</h1>
        </div>
        <button type="button" onClick={() => setOpen(true)} className="btn-primary">
          Send announcement
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
          <div className="card w-full max-w-lg p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-xl">New announcement</h3>
                <p className="mt-1 text-xs text-ink-500">
                  Sends an email + in-app notification to {residentCount} enrolled resident{residentCount === 1 ? '' : 's'} at {buildingName}.
                </p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="text-ink-400 hover:text-ink-100">✕</button>
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
              <button type="button" onClick={send} disabled={busy || !subject.trim() || !body.trim()} className="btn-primary">
                {busy ? 'Sending…' : `Send to ${residentCount}`}
              </button>
              <button type="button" onClick={() => setOpen(false)} className="btn-quiet">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {!announcements.length ? (
        <div className="card p-10 text-center text-ink-400">
          No announcements yet. Send your first one to let residents know wash days are coming.
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => (
            <div key={a.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-display text-lg">{a.subject}</div>
                  <div className="mt-1 text-xs text-ink-400">
                    {new Date(a.created_at).toLocaleString()} · sent to {a.sent_count} resident{a.sent_count === 1 ? '' : 's'}{a.author?.full_name ? ` · by ${a.author.full_name}` : ''}
                  </div>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-ink-200">{a.body}</p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
