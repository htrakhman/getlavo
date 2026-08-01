'use client';
import { useEffect, useMemo, useState } from 'react';
import { DayTimePicker, longLabel, type AvailabilityDay } from '@/components/DayTimePicker';

/**
 * Live slot picker for the QR landing page. Availability comes from the
 * building's assigned operator (hours, capacity, and agreed wash days) via
 * /api/b/availability. The resident picks a day and time here, then the
 * "Book a wash" button routes to signup with the slot carried through the
 * redirect so it's confirmed and paid for after account creation.
 */
export function AvailabilityCalendar({ slug }: { slug: string }) {
  const [days, setDays] = useState<AvailabilityDay[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/b/availability?b=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        const list: AvailabilityDay[] = d.days ?? [];
        setDays(list);
        setSelectedDate(list.find((day) => day.slots.length > 0)?.date ?? null);
      })
      .catch(() => setFailed(true));
  }, [slug]);

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

  const selectedDay = days.find((d) => d.date === selectedDate) ?? null;

  return (
    <div className="card p-5 sm:p-6">
      <div className="flex items-baseline justify-between">
        <div className="text-xs font-semibold uppercase tracking-widest text-gleam">Pick a day & time</div>
        <div className="text-xs text-ink-400">Next two weeks</div>
      </div>

      <div className="mt-4">
        <DayTimePicker
          days={days}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          onSelectDate={(date) => {
            setSelectedDate(date);
            setSelectedTime(null);
          }}
          onSelectTime={(time) => setSelectedTime((prev) => (prev === time ? null : time))}
        />
      </div>

      {!selectedDay && (
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
