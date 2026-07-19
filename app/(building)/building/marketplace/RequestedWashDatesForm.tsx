'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { dateShort } from '@/lib/format';

export function RequestedWashDatesForm({
  buildingId,
  initial,
  matched,
}: {
  buildingId: string;
  initial: string[];
  matched: boolean;
}) {
  const router = useRouter();
  const [dates, setDates] = useState<string[]>(initial);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  function addDate() {
    if (!draft || dates.includes(draft)) return;
    setDates([...dates, draft].sort());
    setDraft('');
  }

  async function save() {
    if (!buildingId) return;
    setBusy(true);
    setErr(null);
    const res = await fetch('/api/buildings/requested-dates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buildingId, dates }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(j.error ?? 'Failed to save dates');
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="date"
          className="field w-auto"
          min={tomorrow}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="button" onClick={addDate} disabled={!draft} className="btn-quiet text-sm">
          Add date
        </button>
      </div>

      {dates.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {dates.map((d) => (
            <span key={d} className="chip">
              {dateShort(d)}
              <button
                type="button"
                aria-label={`Remove ${d}`}
                onClick={() => setDates(dates.filter((x) => x !== d))}
                className="ml-2 text-ink-400 hover:text-red-400"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <p className="mt-3 text-xs text-ink-500">
        {matched
          ? 'Saved dates are confirmed straight onto your operator’s wash day calendar — they override the crew’s own availability.'
          : 'Operators see these dates when browsing your building. Once you’re matched, they’re confirmed onto your operator’s calendar automatically.'}
      </p>

      <div className="mt-4 flex items-center gap-3">
        <button onClick={save} disabled={busy} className="btn-primary">
          {busy ? 'Saving…' : saved ? 'Saved' : 'Save dates'}
        </button>
        {err && <span className="text-sm text-red-400">{err}</span>}
      </div>
    </div>
  );
}
