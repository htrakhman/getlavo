'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type DayHours = { open: string; close: string; closed: boolean };
type Hours = Record<string, DayHours>;

function normalize(raw: unknown): Hours {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Record<string, Partial<DayHours>>;
  return Object.fromEntries(
    DAYS.map((d) => {
      const day = source[d] ?? {};
      return [d, { open: day.open ?? '08:00', close: day.close ?? '17:00', closed: day.closed === true }];
    })
  );
}

/**
 * Post-onboarding editor for the operator's wash days (hours_json). These days
 * drive the booking calendars everywhere — unless a building's property
 * manager has set a preferred wash day, which overrides them for that building.
 */
export function WorkingDaysEditor({ op }: { op: any }) {
  const router = useRouter();
  const [hours, setHours] = useState<Hours>(() => normalize(op.hours_json));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function updateDay(day: string, patch: Partial<DayHours>) {
    setHours((h) => ({ ...h, [day]: { ...h[day], ...patch } }));
  }

  async function save() {
    setBusy(true);
    setErr(null);
    const sb = supabaseBrowser();
    const { error } = await sb.from('operators').update({ hours_json: hours }).eq('id', op.id);
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
    <div className="card p-6">
      <h3 className="font-display text-xl">Wash days & hours</h3>
      <p className="mt-1 mb-4 text-xs text-ink-500">
        The days you select here are the days residents can book you. A building manager can
        override this with a preferred wash day for their building.
      </p>
      <div className="space-y-2">
        {DAYS.map((day) => (
          <div key={day} className="flex items-center gap-4">
            <label className="flex w-24 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!hours[day].closed}
                onChange={(e) => updateDay(day, { closed: !e.target.checked })}
                className="accent-gleam"
              />
              {day}
            </label>
            {!hours[day].closed ? (
              <div className="flex items-center gap-2 text-sm text-ink-300">
                <input
                  type="time"
                  className="field w-28 py-1 text-sm"
                  value={hours[day].open}
                  onChange={(e) => updateDay(day, { open: e.target.value })}
                />
                <span>–</span>
                <input
                  type="time"
                  className="field w-28 py-1 text-sm"
                  value={hours[day].close}
                  onChange={(e) => updateDay(day, { close: e.target.value })}
                />
              </div>
            ) : (
              <span className="text-xs text-ink-500">Closed</span>
            )}
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center gap-3">
        <button onClick={save} disabled={busy} className="btn-primary text-sm">
          {busy ? 'Saving…' : saved ? '✓ Saved' : 'Save wash days'}
        </button>
        {err && <span className="text-sm text-red-400">{err}</span>}
      </div>
    </div>
  );
}
