'use client';
import { useState } from 'react';

const TYPES = ['Missed wash', 'Damage concern', 'Scheduling problem', 'Resident complaint', 'Other'];

type Issue = {
  id: string;
  type: string;
  description: string;
  status: string;
  created_at: string;
};

export function IssuesView({
  buildingId,
  buildingName,
  initialIssues,
}: {
  buildingId: string;
  buildingName: string;
  initialIssues: Issue[];
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState(TYPES[0]);
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [issues, setIssues] = useState(initialIssues);

  async function submit() {
    setBusy(true);
    setErr(null);
    const res = await fetch('/api/issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buildingId, type, description }),
    });
    setBusy(false);
    if (!res.ok) { setErr('Could not submit'); return; }
    const data = await res.json();
    setOpen(false);
    setDescription('');
    setIssues((prev) => [{
      id: data.issueId,
      type,
      description,
      status: 'open',
      created_at: new Date().toISOString(),
    }, ...prev]);
  }

  const openIssues = issues.filter((i) => i.status !== 'resolved');
  const resolved = issues.filter((i) => i.status === 'resolved');

  return (
    <>
      <div className="mb-8 flex items-end justify-between gap-6">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-gleam">{buildingName}</div>
          <h1 className="mt-1 font-display text-4xl tracking-tight">Issues</h1>
        </div>
        <button type="button" onClick={() => setOpen(true)} className="btn-primary">
          Report an issue
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
          <div className="card w-full max-w-md p-6">
            <h3 className="font-display text-xl">Report an issue</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="label">Type</label>
                <select className="field" value={type} onChange={(e) => setType(e.target.value)}>
                  {TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="field min-h-24" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              {err && <div className="text-sm text-red-400">{err}</div>}
              <div className="flex gap-2">
                <button type="button" onClick={submit} disabled={busy || !description.trim()} className="btn-primary text-sm">
                  {busy ? 'Submitting…' : 'Submit'}
                </button>
                <button type="button" onClick={() => setOpen(false)} className="btn-quiet text-sm">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {openIssues.length === 0 && resolved.length === 0 && (
        <div className="card p-10 text-center text-ink-400">
          No issues reported. If something comes up, report it here and Lavo will follow up within 24 hours.
        </div>
      )}

      {openIssues.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs uppercase tracking-widest text-ink-400 mb-3">Open</h2>
          <div className="space-y-3">
            {openIssues.map((i) => <IssueCard key={i.id} issue={i} />)}
          </div>
        </div>
      )}

      {resolved.length > 0 && (
        <div>
          <h2 className="text-xs uppercase tracking-widest text-ink-400 mb-3">Resolved</h2>
          <div className="space-y-3">
            {resolved.map((i) => <IssueCard key={i.id} issue={i} />)}
          </div>
        </div>
      )}
    </>
  );
}

function IssueCard({ issue }: { issue: Issue }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs text-ink-400">{new Date(issue.created_at).toLocaleDateString()} · {issue.type}</div>
          <p className="mt-1 text-sm text-ink-200">{issue.description}</p>
        </div>
        <span className={`chip ${issue.status === 'resolved' ? 'text-gleam' : ''}`}>{issue.status.replace('_', ' ')}</span>
      </div>
    </div>
  );
}
