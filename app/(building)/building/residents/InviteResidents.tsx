'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Row = { email: string; fullName: string; unitNumber: string };

export function InviteResidents({ buildingSlug }: { buildingSlug: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'paste' | 'rows' | 'csv'>('paste');
  const [paste, setPaste] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<Row[]>([]);
  const [rows, setRows] = useState<Row[]>([{ email: '', fullName: '', unitNumber: '' }]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);

  function parseCsv(text: string): Row[] {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length === 0) return [];
    const sep = lines[0].includes('\t') ? '\t' : ',';
    const headers = lines[0].split(sep).map((h) => h.trim().toLowerCase());
    const findIdx = (...names: string[]) => headers.findIndex((h) => names.some((n) => h.includes(n)));
    const emailIdx = findIdx('email', 'e-mail');
    const nameIdx = findIdx('name', 'resident', 'full');
    const unitIdx = findIdx('unit', 'apt', 'suite');

    // If no email header, treat every line as raw paste fallback
    if (emailIdx === -1) return parsePasteText(text);

    return lines.slice(1)
      .map((l) => {
        const cells = l.split(sep).map((c) => c.trim().replace(/^"|"$/g, ''));
        const email = cells[emailIdx] ?? '';
        const fullName = nameIdx >= 0 ? cells[nameIdx] ?? '' : '';
        const unitNumber = unitIdx >= 0 ? cells[unitIdx] ?? '' : '';
        return { email, fullName, unitNumber };
      })
      .filter((r) => r.email.includes('@'));
  }

  function parsePasteText(text: string): Row[] {
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(/[\t,;]/).map((p) => p.trim()).filter(Boolean);
        const emailPart = parts.find((p) => p.includes('@')) ?? parts[0];
        const others = parts.filter((p) => p !== emailPart);
        const fullName = others.find((p) => /[A-Za-z]\s[A-Za-z]/.test(p)) ?? others[0] ?? '';
        const unitNumber = others.find((p) => p !== fullName) ?? '';
        return { email: emailPart ?? '', fullName, unitNumber };
      })
      .filter((r) => r.email.includes('@'));
  }

  function parsePaste(): Row[] {
    return parsePasteText(paste);
  }

  async function handleCsv(file: File) {
    const text = await file.text();
    const parsed = parseCsv(text);
    setCsvPreview(parsed);
    setCsvFile(file);
  }

  async function send() {
    setBusy(true);
    setErr(null);
    const invites =
      mode === 'paste' ? parsePaste()
      : mode === 'csv' ? csvPreview
      : rows.filter((r) => r.email.includes('@'));
    if (invites.length === 0) {
      setErr('Add at least one valid email.');
      setBusy(false);
      return;
    }
    const res = await fetch('/api/building/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invites }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setErr(data.error ?? 'Could not send');
      return;
    }
    setDone(data.sent ?? invites.length);
    router.refresh();
    setTimeout(() => {
      setOpen(false);
      setDone(null);
      setPaste('');
      setRows([{ email: '', fullName: '', unitNumber: '' }]);
    }, 1500);
  }

  if (!open) {
    return <button onClick={() => setOpen(true)} className="btn-primary">Invite residents</button>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
      <div className="card max-h-[90vh] w-full max-w-xl overflow-y-auto p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-xl">Invite residents</h3>
            <p className="mt-1 text-xs text-ink-500">
              We'll email everyone with a personalized signup link to your building's page.
            </p>
          </div>
          <button onClick={() => setOpen(false)} className="text-ink-400 hover:text-ink-100">✕</button>
        </div>

        <div className="mt-4 flex gap-1 rounded-lg bg-white/5 p-1 text-xs">
          {[
            ['paste', 'Paste a list'],
            ['rows', 'Add one by one'],
            ['csv', 'CSV upload'],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setMode(id as any)}
              className={`flex-1 rounded-md px-3 py-1.5 ${mode === id ? 'bg-ink-900 text-ink-100' : 'text-ink-400'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === 'paste' ? (
          <>
            <textarea
              className="field mt-4 min-h-40 font-mono text-xs"
              placeholder={'jane@email.com\nJohn Smith, john@email.com, 4B\nmaria@email.com,2C'}
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
            />
            <p className="mt-1 text-xs text-ink-500">
              One per line. Accepts email, or "name, email, unit" — order doesn't matter, the email is detected automatically.
            </p>
          </>
        ) : mode === 'csv' ? (
          <div className="mt-4 space-y-3">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => e.target.files?.[0] && handleCsv(e.target.files[0])}
              className="field !p-2 text-sm"
            />
            <p className="text-xs text-ink-500">
              CSV with headers like <code>email, name, unit</code>. We auto-detect columns by name.
            </p>
            {csvPreview.length > 0 && (
              <div className="card max-h-48 overflow-y-auto p-3 text-xs">
                <div className="text-gleam">{csvPreview.length} valid row{csvPreview.length === 1 ? '' : 's'}</div>
                <ul className="mt-2 space-y-0.5">
                  {csvPreview.slice(0, 10).map((r, i) => (
                    <li key={i} className="text-ink-400">{r.email} {r.fullName && `· ${r.fullName}`} {r.unitNumber && `· ${r.unitNumber}`}</li>
                  ))}
                  {csvPreview.length > 10 && <li className="text-ink-500">…and {csvPreview.length - 10} more</li>}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {rows.map((r, i) => (
              <div key={i} className="grid grid-cols-12 gap-2">
                <input
                  className="field col-span-5 text-sm"
                  placeholder="Email"
                  value={r.email}
                  onChange={(e) => setRows((p) => p.map((x, idx) => (idx === i ? { ...x, email: e.target.value } : x)))}
                />
                <input
                  className="field col-span-4 text-sm"
                  placeholder="Name (optional)"
                  value={r.fullName}
                  onChange={(e) => setRows((p) => p.map((x, idx) => (idx === i ? { ...x, fullName: e.target.value } : x)))}
                />
                <input
                  className="field col-span-2 text-sm"
                  placeholder="Unit"
                  value={r.unitNumber}
                  onChange={(e) => setRows((p) => p.map((x, idx) => (idx === i ? { ...x, unitNumber: e.target.value } : x)))}
                />
                <button
                  onClick={() => setRows((p) => p.filter((_, idx) => idx !== i))}
                  className="col-span-1 text-xs text-ink-400 hover:text-red-400"
                >✕</button>
              </div>
            ))}
            <button
              onClick={() => setRows((p) => [...p, { email: '', fullName: '', unitNumber: '' }])}
              className="btn-quiet text-xs"
            >+ Add row</button>
          </div>
        )}

        {err && <div className="mt-3 text-sm text-red-400">{err}</div>}
        {done != null && <div className="mt-3 text-sm text-gleam">Sent {done} invite{done === 1 ? '' : 's'}.</div>}

        <div className="mt-6 flex gap-2">
          <button onClick={send} disabled={busy} className="btn-primary">
            {busy ? 'Sending…' : 'Send invites'}
          </button>
          <button onClick={() => setOpen(false)} className="btn-quiet">Cancel</button>
        </div>
      </div>
    </div>
  );
}
