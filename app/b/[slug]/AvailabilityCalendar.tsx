'use client';
import { useEffect, useMemo, useState } from 'react';

type Day = { date: string; dow: string; slots: string[]; full: boolean };

function dayNumber(date: string): string {
  return String(parseInt(date.slice(8, 10), 10));
}

function monthLabel(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { month: 'short' });
}

function longLabel(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Live slot picker for the QR landing page. Availability comes from the
 * building's assigned operator (hours + capacity) via /api/b/availability —
 * picking a slot routes to signup with the slot carried through the redirect
 * so it's preselected in the booking form after account creation.
 */
export function AvailabilityCalendar({ slug }: { slug: string }) {
  const [days, setDays] = useState<Day[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/b/availability?b=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        const list: Day[] = d.days ?? [];
        setDays(list);
        setSelected(list.find((day) => day.slots.length > 0)?.date ?? null);
      })
      .catch(() => setFailed(true));
  }, [slug]);

  const selectedDay = useMemo(
    () => days?.find((d) => d.date === selected) ?? null,
    [days, selected]
  );

  function slotHref(date: string, time: string) {
    const schedule = `/schedule?b=${encodeURIComponent(slug)}&date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}`;
    return `/signup?role=resident&b=${encodeURIComponent(slug)}&redirect=${encodeURIComponent(schedule)}`;
  }

  if (failed || (days && days.length === 0)) {
    // No live schedule — fall back to the plain signup CTA.
    return (
      <a
        href={`/signup?role=resident&b=${encodeURIComponent(slug)}&redirect=${encodeURIComponent(`/schedule?b=${slug}`)}`}
        className="btn-primary w-full py-3.5 text-base"
      >
        Book a wash
      </a>
    );
  }

  if (!days) {
    return (
      <div className="card p-6">
        <div className="h-4 w-36 animate-pulse rounded bg-white/10" />
        <div className="mt-4 flex gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 w-12 shrink-0 animate-pulse rounded-xl bg-white/5" />
          ))}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-xl bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card p-5 sm:p-6">
      <div className="flex items-baseline justify-between">
        <div className="text-xs font-semibold uppercase tracking-widest text-gleam">Pick a time</div>
        <div className="text-xs text-ink-400">Next two weeks</div>
      </div>

      {/* Day strip */}
      <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-2" role="tablist" aria-label="Choose a day">
        {days.map((day) => {
          const isSelected = day.date === selected;
          const unavailable = day.slots.length === 0;
          return (
            <button
              key={day.date}
              role="tab"
              aria-selected={isSelected}
              disabled={unavailable}
              onClick={() => setSelected(day.date)}
              className={`flex w-14 shrink-0 flex-col items-center rounded-xl border px-2 py-2.5 transition ${
                isSelected
                  ? 'border-gleam/60 bg-gleam/10 shadow-glow'
                  : unavailable
                    ? 'border-white/5 opacity-35'
                    : 'border-white/10 hover:border-white/25'
              }`}
            >
              <span className="text-[10px] uppercase tracking-wide text-ink-400">{day.dow}</span>
              <span className={`mt-0.5 font-display text-lg ${isSelected ? 'text-gleam' : 'text-ink-100'}`}>
                {dayNumber(day.date)}
              </span>
              <span className="text-[10px] text-ink-500">{monthLabel(day.date)}</span>
            </button>
          );
        })}
      </div>

      {/* Slots for the selected day */}
      {selectedDay ? (
        <>
          <div className="mt-4 text-sm text-ink-300">{longLabel(selectedDay.date)}</div>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {selectedDay.slots.map((time) => (
              <a
                key={time}
                href={slotHref(selectedDay.date, time)}
                className="rounded-xl border border-white/10 bg-ink-900/60 px-2 py-2.5 text-center text-sm text-ink-100 transition hover:border-gleam/50 hover:bg-gleam/10 hover:text-gleam"
              >
                {time}
              </a>
            ))}
          </div>
          <p className="mt-4 text-xs text-ink-500">
            Pick a slot to create your account — your time carries over to checkout.
          </p>
        </>
      ) : (
        <p className="mt-4 text-sm text-ink-400">
          No open slots in the next two weeks — sign up and we&apos;ll notify you when new times open.
        </p>
      )}
    </div>
  );
}
