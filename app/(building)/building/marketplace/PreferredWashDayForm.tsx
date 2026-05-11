'use client';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function PreferredWashDayForm({ buildingId, initial }: { buildingId: string; initial: string }) {
  const [day, setDay] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    if (!buildingId) return;
    setBusy(true);
    setErr(null);
    const sb = supabaseBrowser();
    const { error } = await sb.from('buildings').update({ preferred_wash_day: day }).eq('id', buildingId);
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        {DAYS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDay(d)}
            className={`chip ${day === d ? 'border-gleam text-gleam' : ''}`}
          >
            {d}
          </button>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button onClick={save} disabled={busy || !day} className="btn-primary">
          {busy ? 'Saving…' : saved ? 'Saved' : 'Save preference'}
        </button>
        {err && <span className="text-sm text-red-400">{err}</span>}
      </div>
    </div>
  );
}
