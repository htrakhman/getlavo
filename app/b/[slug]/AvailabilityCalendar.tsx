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
 * building's assigned operator (hours, capacity, and agreed wash days) via
 * /api/b/availability. The resident picks a day and time here, then the
 * "Book a wash" button routes to signup with the slot carried through the
 * redirect so it's confirmed and paid for after account creation.
 */
export function AvailabilityCalendar({ slug }: { slug: string }) {
  const [days, setDays] = useState<Day[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/b/availability?b=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        const list: Day[] = d.days ?? [];
        setDays(list);
        setSelectedDate(list.find((day) => day.slots.length > 0)?.date ?? null);
      })
      .catch(() => setFailed(true));
  }, [slug]);

  const selectedDay = useMemo(
    () => days?.find((d) => d.date === selectedDate) ?? null,
    [days, selectedDate]
  );

  const bookHref = useMemo(() => {
    const schedule =
      selectedDate && selectedTime
        ? `/schedule?b=${encodeURIComponent(slug)}&date=${encodeURIComponent(selectedDate)}&time=${encodeURIComponent(selectedTime)}`
        : `/schedule?b=${encodeURIComponent(slug)}`;
    return `/signup?role=resident&b=${encodeURIComponent(slug)}&redirect=${encodeURIComponent(schedule)}`;
  }, [slug, selectedDate, selectedTime]);

  if (failed || (days && days.length === 0)) {
    // No live schedule — fall back to the plain signup CTA.
    return (
      <a href={bookHref} className="btn-primary w-full py-3.5 text-base">
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
        <div className="text-xs font-semibold uppercase tracking-widest text-gleam">Pick a day & time</div>
        <div className="text-xs text-ink-400">Next two weeks</div>
      </div>

      {/* Day strip */}
      <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-2" role="tablist" aria-label="Choose a day">
        {days.map((day) => {
          const isSelected = day.date === selectedDate;
          const unavailable = day.slots.length === 0;
          return (
            <button
              key={day.date}
              role="tab"
              aria-selected={isSelected}
              disabled={unavailable}
              onClick={() => {
                setSelectedDate(day.date);
                setSelectedTime(null);
              }}
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
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Choose a time">
            {selectedDay.slots.map((time) => {
              const isSelected = time === selectedTime;
              return (
                <button
                  key={time}
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setSelectedTime(isSelected ? null : time)}
                  className={`rounded-xl border px-2 py-2.5 text-center text-sm transition ${
                    isSelected
                      ? 'border-gleam/70 bg-gleam/15 font-semibold text-gleam shadow-glow'
                      : 'border-white/10 bg-ink-900/60 text-ink-100 hover:border-gleam/40'
                  }`}
                >
                  {time}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <p className="mt-4 text-sm text-ink-400">
          No open slots in the next two weeks — sign up and we&apos;ll notify you when new times open.
        </p>
      )}

      {/* Book CTA — enabled once a slot is picked */}
      <div className="mt-5 border-t border-white/10 pt-5">
        {selectedDate && selectedTime ? (
          <div className="mb-3 text-center text-sm text-ink-200">
            {longLabel(selectedDate)} · <span className="font-semibold text-gleam">{selectedTime}</span>
          </div>
        ) : (
          <div className="mb-3 text-center text-xs text-ink-500">
            {selectedDay ? 'Select a time slot above to continue' : 'You can still sign up and pick a time later'}
          </div>
        )}
        <a
          href={bookHref}
          aria-disabled={Boolean(selectedDay && !selectedTime)}
          className={`btn-primary w-full py-3.5 text-base ${selectedDay && !selectedTime ? 'pointer-events-none opacity-40' : ''}`}
        >
          Book a wash
        </a>
        <p className="mt-3 text-center text-xs text-ink-500">
          Your slot carries over — confirm it and pay after creating your account.
        </p>
      </div>
    </div>
  );
}
