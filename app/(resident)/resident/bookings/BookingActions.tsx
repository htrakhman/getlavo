'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DayTimePicker, longLabel, type AvailabilityDay } from '@/components/DayTimePicker';
import { CancelBookingButton } from './CancelBookingButton';
import {
  CANCELLATION_CUTOFF_HOURS,
  cancellationNotice,
  refundEligibility,
} from '@/lib/cancellation-policy';

/**
 * What a resident can do to a wash they've already booked: move it, drop it, or
 * book another one with the same operator.
 *
 * Rescheduling reads the operator's live availability rather than offering a
 * free-form date, so the resident can only land on a slot the crew is actually
 * working — the same list the booking form shows, minus this booking's own seat
 * (see /api/availability).
 *
 * Both moving and refunding stop 24 hours before the wash (see
 * lib/cancellation-policy.ts). Inside that window the Reschedule button says why
 * it's unavailable rather than opening a picker whose every choice the server
 * would refuse.
 */
export function BookingActions({
  bookingId,
  operatorId,
  scheduledFor,
  timeSlot,
}: {
  bookingId: string;
  operatorId: string;
  scheduledFor: string;
  timeSlot: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState<AvailabilityDay[] | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Availability is only fetched once the resident asks to move the booking —
  // most visits to this page never open the picker at all.
  useEffect(() => {
    if (!open || days) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(
        `/api/availability?operatorId=${operatorId}&rescheduleBookingId=${bookingId}`,
      ).catch(() => null);
      const d = await res?.json().catch(() => null);
      if (cancelled) return;
      const list: AvailabilityDay[] = d?.days ?? [];
      setDays(list);
      // Open on the day the wash is on now when it's still offered, so a
      // time-only change is one tap; otherwise on the first day with openings.
      const current = list.find((day) => day.date === scheduledFor && day.slots.length > 0);
      const first = current ?? list.find((day) => day.slots.length > 0) ?? null;
      if (first) {
        setDate(first.date);
        setTime(current && timeSlot && current.slots.includes(timeSlot) ? timeSlot : null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, days, operatorId, bookingId, scheduledFor, timeSlot]);

  const unchanged = date === scheduledFor && time === timeSlot;
  const cancelWindow = refundEligibility(scheduledFor, timeSlot);

  async function submit() {
    if (!date) return;
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/bookings/${bookingId}/reschedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduledFor: date, timeSlot: time ?? undefined }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(d.error || 'Could not move your booking. Please try again.');
      // Availability may have moved on under the resident — refetch on the next open.
      setDays(null);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="mt-4 border-t border-white/10 pt-3">
      {/* The policy, on the booking it applies to — a resident shouldn't have
          to remember a checkout footnote to know where their money stands. */}
      <p className="mb-2 text-right text-[11px] text-ink-500">
        {cancellationNotice(cancelWindow)}{' '}
        <a
          href="/legal/terms"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 hover:text-gleam"
        >
          Cancellation policy
        </a>
      </p>
      <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-xs">
        <Link
          href={`/resident/book/${operatorId}`}
          className="text-ink-500 transition hover:text-gleam"
        >
          Book another wash
        </Link>
        {cancelWindow.refundable ? (
          <button
            onClick={() => setOpen((v) => !v)}
            className="text-ink-500 transition hover:text-gleam"
            aria-expanded={open}
          >
            {open ? 'Keep this time' : 'Reschedule'}
          </button>
        ) : (
          <span
            className="cursor-not-allowed text-ink-600"
            title={`Washes can be moved up to ${CANCELLATION_CUTOFF_HOURS} hours before they start.`}
          >
            Reschedule closed
          </span>
        )}
        <CancelBookingButton bookingId={bookingId} scheduledFor={scheduledFor} timeSlot={timeSlot} />
      </div>

      {open && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-ink-900/60 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h4 className="font-display text-base">Pick a new day and time</h4>
            <span className="text-xs text-ink-400">
              Currently {longLabel(scheduledFor)}
              {timeSlot ? ` at ${timeSlot}` : ''}
            </span>
          </div>

          {days === null ? (
            <p className="mt-4 text-sm text-ink-400">Loading open slots…</p>
          ) : days.some((d) => d.slots.length > 0) ? (
            <>
              <div className="mt-3">
                <DayTimePicker
                  days={days}
                  selectedDate={date}
                  selectedTime={time}
                  onSelectDate={(d) => {
                    setDate(d);
                    setTime(null);
                  }}
                  onSelectTime={setTime}
                />
              </div>
              {err && <p className="mt-3 text-xs text-red-400">{err}</p>}
              <div className="mt-4 flex items-center justify-end gap-3">
                <button
                  onClick={() => setOpen(false)}
                  className="text-xs text-ink-500 transition hover:text-ink-300"
                >
                  Never mind
                </button>
                <button
                  onClick={submit}
                  disabled={busy || !date || !time || unchanged}
                  className="btn-primary"
                >
                  {busy ? 'Moving…' : 'Move my wash'}
                </button>
              </div>
              <p className="mt-2 text-right text-[11px] text-ink-400">
                Moving your wash doesn&apos;t change the price or your add-ons.
              </p>
            </>
          ) : (
            <p className="mt-4 text-sm text-ink-400">
              Your operator has no open slots in the next two weeks. Cancel for a full refund — you
              are outside the {CANCELLATION_CUTOFF_HOURS}-hour window — and rebook when new days
              open up.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
