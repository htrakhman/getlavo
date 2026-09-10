'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { MINIMUM_CUTOFF_HOURS, MAX_MINIMUM, normalizeMinimum } from '@/lib/wash-day-minimum';

/**
 * How many cars make a trip worth taking.
 *
 * Without this an operator was committed to every wash day on their calendar
 * regardless of how many people booked it — a round trip for one car at the
 * wash-day rate loses money, and the only way out was to not show up, which the
 * platform had no way to represent. Setting a number here lets a thin day be
 * called off cleanly and early, with the residents refunded automatically.
 */
export function MinimumBookingsEditor({ op }: { op: any }) {
  const router = useRouter();
  const [value, setValue] = useState(
    op.min_bookings_per_day > 0 ? String(op.min_bookings_per_day) : '',
  );
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const minimum = normalizeMinimum(value);

  async function save() {
    setBusy(true);
    setErr(null);
    const sb = supabaseBrowser();
    const { error } = await sb
      .from('operators')
      .update({ min_bookings_per_day: minimum })
      .eq('id', op.id);
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
      <div className="mb-4">
        <h3 className="font-display text-xl">Minimum bookings per wash day</h3>
        <p className="mt-0.5 text-xs text-ink-500">
          The number of cars that makes the trip worth taking. You are never obligated to serve a
          day that falls short of it.
        </p>
      </div>

      <div className="max-w-[220px]">
        <label className="label" htmlFor="min-bookings">Cars required</label>
        <input
          id="min-bookings"
          className="field"
          type="number"
          step="1"
          min="0"
          max={MAX_MINIMUM}
          placeholder="e.g. 4"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <p className="mt-1 text-xs text-ink-500">Leave blank or 0 to serve every scheduled day.</p>
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-ink-400">
        {minimum > 0 ? (
          <>
            We check each wash day <strong className="text-ink-200">{MINIMUM_CUTOFF_HOURS} hours before</strong> it.
            With fewer than <strong className="text-ink-200">{minimum}</strong>{' '}
            {minimum === 1 ? 'booking' : 'bookings'}, the day comes off your calendar and everyone
            who booked is refunded automatically — you keep the goodwill and lose nothing. At{' '}
            {minimum} or more it locks in and you serve it.
          </>
        ) : (
          <>No minimum set. Every scheduled wash day stays on your calendar, however many cars book it.</>
        )}
      </div>

      {err && <div className="mt-3 text-sm text-red-400">{err}</div>}

      <div className="mt-5">
        <button onClick={save} disabled={busy} className="btn-primary text-sm">
          {busy ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}
