'use client';

import { useEffect, useMemo, useState } from 'react';
import type { AvailabilityDay } from './DayTimePicker';

/**
 * Full month-grid calendar with a time-slot picker, used by the resident
 * booking page. The compact day-strip (`DayTimePicker`) still serves the QR
 * landing page and any narrow surface; this one is for the booking screen
 * where the calendar is the main event and there's room for a real month view.
 *
 * Availability windows are short (14 days from tomorrow), so the grid renders
 * whole months and greys out everything outside the bookable window rather
 * than pretending days beyond it don't exist.
 */

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** YYYY-MM-DD → local midnight (never UTC, which slides the day backwards). */
function parseLocal(date: string): Date {
  return new Date(`${date}T00:00:00`);
}

function isoOf(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function monthKeyOf(date: string): string {
  return date.slice(0, 7);
}

function monthTitle(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function longLabel(date: string): string {
  return parseLocal(date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

/** "1:00 PM" → 13. Slots come from the operator's hours as on-the-hour labels. */
function slotHour(label: string): number {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(label.trim());
  if (!m) return 12;
  let h = parseInt(m[1], 10) % 12;
  if (m[3].toUpperCase() === 'PM') h += 12;
  return h;
}

const SLOT_GROUPS = [
  { label: 'Morning', match: (h: number) => h < 12 },
  { label: 'Afternoon', match: (h: number) => h >= 12 && h < 17 },
  { label: 'Evening', match: (h: number) => h >= 17 },
];

export function BookingCalendar({
  days,
  selectedDate,
  selectedTime,
  onSelectDate,
  onSelectTime,
}: {
  days: AvailabilityDay[];
  selectedDate: string | null;
  selectedTime: string | null;
  onSelectDate: (date: string) => void;
  onSelectTime: (time: string) => void;
}) {
  const byDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);

  // Every month the availability window touches, in order — the only months
  // the arrows can reach.
  const months = useMemo(() => {
    const seen: string[] = [];
    for (const d of days) {
      const key = monthKeyOf(d.date);
      if (!seen.includes(key)) seen.push(key);
    }
    return seen.length > 0 ? seen : [new Date().toISOString().slice(0, 7)];
  }, [days]);

  const firstBookable = days.find((d) => d.slots.length > 0)?.date ?? days[0]?.date ?? null;
  const [monthIndex, setMonthIndex] = useState(() => {
    const anchor = selectedDate ?? firstBookable;
    const idx = anchor ? months.indexOf(monthKeyOf(anchor)) : 0;
    return idx >= 0 ? idx : 0;
  });

  // Follow the selection when it jumps months (a slot arriving from the QR
  // landing page, or availability reloading under a stale month).
  useEffect(() => {
    if (!selectedDate) return;
    const idx = months.indexOf(monthKeyOf(selectedDate));
    if (idx >= 0) setMonthIndex(idx);
  }, [selectedDate, months]);

  const monthKey = months[Math.min(monthIndex, months.length - 1)];
  const [year, month] = monthKey.split('-').map(Number);
  const monthIdx = month - 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  const leading = new Date(year, monthIdx, 1).getDay();
  const todayIso = (() => {
    const now = new Date();
    return isoOf(now.getFullYear(), now.getMonth(), now.getDate());
  })();

  const selectedDay = selectedDate ? byDate.get(selectedDate) ?? null : null;
  const grouped = SLOT_GROUPS.map((g) => ({
    label: g.label,
    slots: (selectedDay?.slots ?? []).filter((s) => g.match(slotHour(s))),
  })).filter((g) => g.slots.length > 0);

  return (
    <div>
      {/* Month header */}
      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-2 py-2">
        <button
          type="button"
          onClick={() => setMonthIndex((i) => Math.max(0, i - 1))}
          disabled={monthIndex <= 0}
          aria-label="Previous month"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-ink-900 text-lg leading-none text-ink-300 transition hover:border-gleam/40 hover:text-gleam active:scale-95 disabled:opacity-25 disabled:hover:border-white/10 disabled:hover:text-ink-300"
        >
          ‹
        </button>
        <div className="font-display text-lg font-semibold tracking-tight">{monthTitle(monthKey)}</div>
        <button
          type="button"
          onClick={() => setMonthIndex((i) => Math.min(months.length - 1, i + 1))}
          disabled={monthIndex >= months.length - 1}
          aria-label="Next month"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-ink-900 text-lg leading-none text-ink-300 transition hover:border-gleam/40 hover:text-gleam active:scale-95 disabled:opacity-25 disabled:hover:border-white/10 disabled:hover:text-ink-300"
        >
          ›
        </button>
      </div>

      {/* Weekday header */}
      <div className="mt-4 grid grid-cols-7 gap-1.5 sm:gap-2">
        {WEEKDAYS.map((w) => (
          <div key={w} className="pb-1 text-center text-[11px] font-medium uppercase tracking-widest text-ink-500">
            {w.slice(0, 3)}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2" role="grid" aria-label="Choose a date">
        {Array.from({ length: leading }).map((_, i) => (
          <div key={`pad-${i}`} aria-hidden />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const iso = isoOf(year, monthIdx, dayNum);
          const day = byDate.get(iso);
          const open = !!day && day.slots.length > 0;
          const isSelected = iso === selectedDate;
          const isToday = iso === todayIso;

          return (
            <button
              key={iso}
              type="button"
              role="gridcell"
              aria-selected={isSelected}
              aria-label={`${longLabel(iso)}${open ? `, ${day!.slots.length} times open` : ', unavailable'}`}
              disabled={!open}
              onClick={() => onSelectDate(iso)}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-xl border text-sm transition duration-150 ${
                isSelected
                  ? 'scale-[1.04] border-gleam bg-gleam text-ink-950 shadow-glow'
                  : open
                    ? 'border-white/10 bg-ink-900 text-ink-100 hover:-translate-y-0.5 hover:border-gleam/50 hover:bg-gleam/[0.07] hover:text-gleam'
                    : day
                      // In the booking window but the operator isn't serving.
                      ? 'cursor-not-allowed border-transparent bg-white/5 text-ink-500/70'
                      // Outside the 14-day window entirely.
                      : 'cursor-not-allowed border-transparent text-ink-500/50'
              }`}
            >
              <span className={`font-display text-base leading-none ${isSelected ? 'font-bold' : 'font-medium'}`}>
                {dayNum}
              </span>
              {open ? (
                <span className={`mt-1 text-[10px] leading-none ${isSelected ? 'text-ink-950/75' : 'text-ink-500'}`}>
                  {day!.slots.length} open
                </span>
              ) : day?.full ? (
                <span className="mt-1 text-[10px] leading-none text-ink-500/70">full</span>
              ) : (
                <span className="mt-1 h-[10px]" aria-hidden />
              )}
              {isToday && open && !isSelected && (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-ink-400" aria-hidden />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-ink-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[4px] border border-white/10 bg-ink-900/40" aria-hidden /> Available
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[4px] border border-gleam bg-gleam" aria-hidden /> Selected
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[4px] bg-white/5" aria-hidden /> No service
        </span>
      </div>

      {/* Times for the selected day */}
      <div className="mt-6 border-t border-white/10 pt-5">
        {selectedDay && grouped.length > 0 ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="h-6 w-1 rounded-full bg-gleam" aria-hidden />
                <span className="font-display text-base font-semibold tracking-tight">
                  {longLabel(selectedDay.date)}
                </span>
              </div>
              <span className="chip border-gleam/25 bg-gleam/[0.07] text-gleam">
                {selectedDay.slots.length} time{selectedDay.slots.length === 1 ? '' : 's'} available
              </span>
            </div>
            <div className="mt-4 space-y-4" role="radiogroup" aria-label="Choose a time">
              {grouped.map((group) => (
                <div key={group.label}>
                  <div className="mb-2 text-[11px] font-medium uppercase tracking-widest text-ink-500">
                    {group.label}
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                    {group.slots.map((time) => {
                      const isSelected = time === selectedTime;
                      return (
                        <button
                          key={time}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          onClick={() => onSelectTime(time)}
                          className={`rounded-xl border px-2 py-2.5 text-center text-sm tabular-nums transition duration-150 ${
                            isSelected
                              ? 'border-gleam bg-gleam font-bold text-ink-950 shadow-glow'
                              : 'border-white/10 bg-ink-900 font-medium text-ink-100 hover:-translate-y-0.5 hover:border-gleam/50 hover:text-gleam'
                          }`}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-ink-400">
            Pick a date above to see the times your operator has open.
          </p>
        )}
      </div>
    </div>
  );
}
