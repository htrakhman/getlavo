'use client';

export type AvailabilityDay = { date: string; dow: string; slots: string[]; full: boolean };

function dayNumber(date: string): string {
  return String(parseInt(date.slice(8, 10), 10));
}

function monthLabel(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { month: 'short' });
}

export function longLabel(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Day-strip + time-slot grid calendar picker, shared by the QR landing page
 * and the resident booking form so both present the same visual calendar
 * over the same /api/*availability shape (AvailabilityDay[]).
 */
export function DayTimePicker({
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
  const selectedDay = days.find((d) => d.date === selectedDate) ?? null;

  return (
    <div>
      {/* Day strip */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2" role="tablist" aria-label="Choose a day">
        {days.map((day) => {
          const isSelected = day.date === selectedDate;
          const unavailable = day.slots.length === 0;
          return (
            <button
              key={day.date}
              type="button"
              role="tab"
              aria-selected={isSelected}
              disabled={unavailable}
              onClick={() => onSelectDate(day.date)}
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
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => onSelectTime(time)}
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
        <p className="mt-4 text-sm text-ink-400">Select a day above to see open times.</p>
      )}
    </div>
  );
}
