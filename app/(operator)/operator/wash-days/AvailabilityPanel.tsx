'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { dateShort } from '@/lib/format';

export function AvailabilityPanel({
  operatorId,
  initial,
}: {
  operatorId: string;
  initial: string[];
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
    setBusy(true);
    setErr(null);
    const { error } = await supabaseBrowser()
      .from('operators')
      .update({ availability_dates: dates })
      .eq('id', operatorId);
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  return (
    <div className="card p-6 md:p-8 mb-8">
      <h3 className="font-display text-lg text-ink-100">Your availability</h3>
      <p className="mt-1 text-xs text-ink-500">
        Dates you&rsquo;re open to run wash days. Property managers see them when choosing a crew.
        Once a building you&rsquo;re matched with picks its dates, those are confirmed onto your
        calendar and take priority over this list.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
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

      {dates.length > 0 ? (
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
      ) : (
        <p className="mt-3 text-xs text-ink-500">No availability posted yet.</p>
      )}

      <div className="mt-5 flex items-center gap-3">
        <button type="button" onClick={save} disabled={busy} className="btn-primary text-sm">
          {busy ? 'Saving…' : 'Save availability'}
        </button>
        {saved && <span className="text-xs text-gleam">Saved</span>}
        {err && <span className="text-sm text-red-400">{err}</span>}
      </div>
    </div>
  );
}
