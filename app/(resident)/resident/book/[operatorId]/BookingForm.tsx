'use client';
import { money, plateLabel } from '@/lib/format';
import { parseSizePrices } from '@/lib/vehicle-sizes';
import { SizePriceList } from '@/components/SizePriceList';
import { BookingCalendar, longLabel } from '@/components/BookingCalendar';
import type { AvailabilityDay } from '@/components/DayTimePicker';
import { captureEvent } from '@/lib/analytics';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const TIME_SLOTS = [
  '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM',
];

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_AHEAD = 14;

/** Local YYYY-MM-DD — never toISOString(), which slides the day in US zones. */
function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isoDateMin() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return isoLocal(d);
}

function isoDateMax() {
  const d = new Date();
  d.setDate(d.getDate() + DAYS_AHEAD);
  return isoLocal(d);
}

/**
 * Every bookable day open, used until the live availability call lands (and as
 * the standing fallback when an operator hasn't published hours). The calendar
 * is the only date picker on this page now, so it always needs days to draw.
 */
function fallbackDays(): AvailabilityDay[] {
  const start = new Date();
  start.setDate(start.getDate() + 1);
  return Array.from({ length: DAYS_AHEAD }).map((_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return { date: isoLocal(d), dow: DOW[d.getDay()], slots: TIME_SLOTS, full: false };
  });
}

type ResidentContext = {
  buildingName: string;
  buildingAddress: string | null;
  unitNumber: string | null;
  spotLabel: string | null;
  accessNotes: string | null;
};

export function BookingForm({
  operatorId,
  operatorName,
  operatorDescription,
  ratingAvg,
  ratingCount,
  basePriceCents,
  openSlotPriceCents,
  vehicles,
  isPartner,
  partnershipId,
  initialDate,
  initialTimeSlot,
  waiverAccepted,
  addons,
  initialAddonIds,
  packages,
  resident,
}: {
  operatorId: string;
  operatorName: string;
  operatorDescription: string | null;
  ratingAvg: number | null;
  ratingCount: number;
  basePriceCents: number;
  openSlotPriceCents: number | null;
  vehicles: {
    id: string;
    make: string;
    model: string;
    color: string;
    year?: number | null;
    license_plate: string;
    notes?: string | null;
    is_primary: boolean;
  }[];
  isPartner: boolean;
  partnershipId?: string;
  initialDate?: string;
  initialTimeSlot?: string;
  waiverAccepted: boolean;
  addons: { id: string; label: string; price_cents: number; size_prices?: unknown }[];
  initialAddonIds: string[];
  packages: { id: string; name: string; description: string | null; price_cents: number; size_prices?: unknown }[];
  resident: ResidentContext;
}) {
  const router = useRouter();
  const [bookingType, setBookingType] = useState<'building_day' | 'open_slot'>(
    isPartner ? 'building_day' : 'open_slot'
  );
  const [vehicleId, setVehicleId] = useState(vehicles.find((v) => v.is_primary)?.id ?? vehicles[0]?.id ?? '');
  const selectedVehicle = vehicles.find((v) => v.id === vehicleId) ?? null;
  // The operator's published wash packages (Basic, Premium, Full detail…),
  // when they've set any up. Picking one overrides the flat building-day /
  // on-demand price below with that package's price.
  const [packageId, setPackageId] = useState('');
  const selectedPackage = packages.find((p) => p.id === packageId) ?? null;
  // A slot picked on the QR landing calendar arrives via query params.
  const [date, setDate] = useState(() =>
    initialDate && initialDate >= isoDateMin() && initialDate <= isoDateMax() ? initialDate : ''
  );
  const [timeSlot, setTimeSlot] = useState(() =>
    initialTimeSlot && TIME_SLOTS.includes(initialTimeSlot) ? initialTimeSlot : TIME_SLOTS[0]
  );

  // Live availability (operator hours + agreed wash days + capacity). Until it
  // lands the calendar draws the open fallback window, so residents never see
  // an empty month while the request is in flight.
  const [availability, setAvailability] = useState<AvailabilityDay[] | null>(null);
  const fallback = useMemo(fallbackDays, []);
  const calendarDays = availability ?? fallback;

  useEffect(() => {
    fetch(`/api/availability?operatorId=${encodeURIComponent(operatorId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const days = (d?.days ?? []) as AvailabilityDay[];
        // Only switch to the live calendar once there's at least one bookable
        // day — otherwise keep the open fallback window.
        if (days.some((day) => day.slots.length > 0)) setAvailability(days);
      })
      .catch(() => {});
  }, [operatorId]);

  const selectedDay = calendarDays.find((d) => d.date === date) ?? null;

  useEffect(() => {
    if (!availability) return;
    // Snap stale selections to the live schedule.
    if (date && !availability.some((d) => d.date === date && d.slots.length > 0)) setDate('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availability]);

  useEffect(() => {
    // Open on the soonest bookable day so the resident lands on a real set of
    // times instead of an empty slot grid.
    if (date) return;
    const first = calendarDays.find((d) => d.slots.length > 0);
    if (first) setDate(first.date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarDays, date]);

  useEffect(() => {
    // Keep the time inside the chosen day's open hours.
    if (selectedDay && selectedDay.slots.length > 0 && !selectedDay.slots.includes(timeSlot)) {
      setTimeSlot(selectedDay.slots[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, availability]);

  const needsWaiver = !waiverAccepted;
  const [agreeWaiver, setAgreeWaiver] = useState(false);
  const [recurring, setRecurring] = useState<'none' | 'weekly' | 'biweekly' | 'monthly'>('none');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState('');
  // Anything the resident already asked for on every wash starts ticked.
  const [addonIds, setAddonIds] = useState<string[]>(initialAddonIds);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('lavo_promo_code') : null;
    if (stored) setPromoCode(stored);
  }, []);

  const washCents = selectedPackage
    ? selectedPackage.price_cents
    : bookingType === 'building_day'
      ? basePriceCents
      : (openSlotPriceCents ?? basePriceCents);

  const selectedAddons = addons.filter((a) => addonIds.includes(a.id));
  const addonCents = selectedAddons.reduce((sum, a) => sum + a.price_cents, 0);

  // The promo is priced by the server against the same rules checkout uses, so
  // what's on screen is what gets charged. Entering a code no longer leaves the
  // total at full price all the way to the Stripe redirect.
  const [promo, setPromo] = useState<{ discountCents: number; reason?: string } | null>(null);
  const [promoChecking, setPromoChecking] = useState(false);

  useEffect(() => {
    const code = promoCode.trim();
    if (!code) { setPromo(null); setPromoChecking(false); return; }

    let cancelled = false;
    setPromoChecking(true);
    const timer = setTimeout(() => {
      fetch('/api/promo/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, operatorId, bookingType }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          if (cancelled) return;
          if (!j) { setPromo(null); return; }
          setPromo(j.valid ? { discountCents: j.discountCents ?? 0 } : { discountCents: 0, reason: j.reason });
        })
        .catch(() => { if (!cancelled) setPromo(null); })
        .finally(() => { if (!cancelled) setPromoChecking(false); });
    }, 400);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [promoCode, operatorId, bookingType]);

  const discountCents = Math.min(promo?.reason ? 0 : (promo?.discountCents ?? 0), washCents);
  const priceCents = Math.max(0, washCents - discountCents) + addonCents;

  async function book() {
    if (!vehicleId || !date) { setErr('Please select a vehicle and date'); return; }
    setBusy(true); setErr(null);
    try {
      const res = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operatorId,
          vehicleId,
          scheduledFor: date,
          timeSlot,
          bookingType,
          packageId: packageId || undefined,
          partnershipId: partnershipId ?? undefined,
          recurringCadence: recurring === 'none' ? undefined : recurring,
          addonIds,
          promoCode: promoCode.trim() || undefined,
          waiverAccepted: needsWaiver ? agreeWaiver : undefined,
        }),
      });

      // A server error can come back with an empty or non-JSON body; parsing
      // that unguarded used to throw and leave the button stuck on
      // "Redirecting to payment…" forever with nothing shown to the resident.
      const text = await res.text();
      let j: any = null;
      try { j = text ? JSON.parse(text) : null; } catch { j = null; }

      if (!res.ok) {
        setErr(j?.error ?? 'We couldn’t start checkout. Please try again.');
        setBusy(false);
        return;
      }
      if (!j || (!j.checkoutUrl && !j.freeBooking)) {
        setErr('We couldn’t start checkout. Please try again.');
        setBusy(false);
        return;
      }

      captureEvent('booking_checkout_started', { operatorId, free: !j.checkoutUrl });
      if (j.checkoutUrl) {
        window.location.href = j.checkoutUrl;
      } else {
        router.push('/resident/bookings');
      }
    } catch (e: any) {
      // Network drop, offline, aborted request — still give a way back.
      setErr('We couldn’t reach the payment service. Please check your connection and try again.');
      setBusy(false);
    }
  }

  const standardWashCents = bookingType === 'building_day' ? basePriceCents : (openSlotPriceCents ?? basePriceCents);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
      {/* ── Left: everything about when, where and who ─────────────────── */}
      {/* Stacked on mobile the package menu comes first — pick the wash, then
          confirm the details and pay — so the CTA is never above the choices. */}
      <div className="order-2 space-y-6 lg:order-1 lg:col-span-2">
        {operatorDescription && (
          <div className="card p-6">
            <p className="text-sm leading-relaxed text-ink-200">{operatorDescription}</p>
            {ratingCount > 0 && (
              <div className="mt-4 flex items-center gap-2 text-sm">
                <span className="font-display text-gleam">★ {Number(ratingAvg ?? 0).toFixed(1)}</span>
                <span className="text-ink-500">{ratingCount} review{ratingCount === 1 ? '' : 's'}</span>
              </div>
            )}
          </div>
        )}

        {/* Where the wash happens — all of it already on file. */}
        <div className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-lg">Where we’ll wash</h3>
            <span className="chip text-ink-400">Auto-filled from your account</span>
          </div>

          <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-[11px] uppercase tracking-widest text-ink-500">Building</dt>
              <dd className="mt-1 text-sm text-ink-100">{resident.buildingName}</dd>
              {resident.buildingAddress && (
                <dd className="mt-0.5 text-xs text-ink-400">{resident.buildingAddress}</dd>
              )}
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-widest text-ink-500">Unit</dt>
              <dd className="mt-1 text-sm text-ink-100">{resident.unitNumber || '—'}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-widest text-ink-500">Parking spot</dt>
              <dd className="mt-1 text-sm text-ink-100">
                {resident.spotLabel || <span className="text-amber-600">Not set</span>}
              </dd>
              {!resident.spotLabel && (
                <dd className="mt-0.5 text-xs text-ink-500">
                  <Link href="/resident/vehicle" className="text-gleam underline underline-offset-2">
                    Add your spot
                  </Link>{' '}
                  so the operator can find your car.
                </dd>
              )}
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-widest text-ink-500">Operator</dt>
              <dd className="mt-1 text-sm text-ink-100">{operatorName}</dd>
            </div>
          </dl>

          {resident.accessNotes && (
            <p className="mt-4 rounded-xl border border-white/10 bg-ink-800/50 p-3 text-xs text-ink-400">
              <span className="text-ink-300">Access notes:</span> {resident.accessNotes}
            </p>
          )}

          <div className="mt-5 border-t border-white/10 pt-5">
            <label className="label" htmlFor="booking-vehicle">Vehicle</label>
            {vehicles.length > 0 ? (
              <>
                <select
                  id="booking-vehicle"
                  className="field"
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.year ? `${v.year} ` : ''}{v.color} {v.make} {v.model}
                      {plateLabel(v.license_plate) ? ` · ${plateLabel(v.license_plate)}` : ''}
                      {v.is_primary && vehicles.length > 1 ? ' (primary)' : ''}
                    </option>
                  ))}
                </select>

                {selectedVehicle && (
                  <dl className="mt-3 grid grid-cols-2 gap-3 rounded-xl border border-white/10 bg-ink-800/50 p-3 sm:grid-cols-3">
                    <div>
                      <dt className="text-[11px] uppercase tracking-widest text-ink-500">Make &amp; model</dt>
                      <dd className="mt-0.5 text-sm text-ink-100">
                        {selectedVehicle.year ? `${selectedVehicle.year} ` : ''}
                        {selectedVehicle.make} {selectedVehicle.model}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] uppercase tracking-widest text-ink-500">Color</dt>
                      <dd className="mt-0.5 text-sm text-ink-100">{selectedVehicle.color}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] uppercase tracking-widest text-ink-500">Plate</dt>
                      <dd className="mt-0.5 text-sm text-ink-100">
                        {plateLabel(selectedVehicle.license_plate) ?? '—'}
                      </dd>
                    </div>
                    {selectedVehicle.notes && (
                      <div className="col-span-2 sm:col-span-3">
                        <dt className="text-[11px] uppercase tracking-widest text-ink-500">Vehicle notes</dt>
                        <dd className="mt-0.5 text-sm text-ink-300">{selectedVehicle.notes}</dd>
                      </div>
                    )}
                  </dl>
                )}

                <p className="mt-2 text-xs text-ink-500">
                  {vehicles.length > 1
                    ? 'Your primary vehicle is pre-selected — switch it for this wash if needed.'
                    : 'Pulled from your profile and sent to the operator with the job.'}{' '}
                  <Link href="/resident/vehicle" className="text-gleam underline underline-offset-2">
                    Manage vehicles
                  </Link>
                </p>
              </>
            ) : (
              <div className="text-sm text-red-400">
                Please{' '}
                <Link href="/resident/vehicle" className="underline underline-offset-2">
                  add a vehicle
                </Link>{' '}
                to your profile first.
              </div>
            )}
          </div>
        </div>

        {/* The calendar — the centerpiece of the page. */}
        <div className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-display text-lg">Pick a date &amp; time</h3>
              <p className="mt-1 text-xs text-ink-500">
                Hourly slots come straight from {operatorName}’s working hours for that day.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip text-ink-200">
                {selectedPackage ? selectedPackage.name : 'Standard wash'} · {money(washCents)}
              </span>
              {date && (
                <span className="chip text-ink-200">
                  {longLabel(date)} · {timeSlot}
                </span>
              )}
            </div>
          </div>

          {isPartner && openSlotPriceCents && (
            <div className="mt-5">
              <label className="label">Wash type</label>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setBookingType('building_day')}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                    bookingType === 'building_day' ? 'border-gleam/60 bg-gleam/5' : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <div>
                    <div className="text-sm font-medium">Building wash day</div>
                    <div className="text-xs text-ink-400">Scheduled visit — best price</div>
                  </div>
                  <span className="font-display text-gleam">{money(basePriceCents)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBookingType('open_slot')}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                    bookingType === 'open_slot' ? 'border-gleam/60 bg-gleam/5' : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <div>
                    <div className="text-sm font-medium">On-demand slot</div>
                    <div className="text-xs text-ink-400">Any available date</div>
                  </div>
                  <span className="font-display">{money(openSlotPriceCents)}</span>
                </button>
              </div>
            </div>
          )}

          <div className="mt-5">
            <BookingCalendar
              days={calendarDays}
              selectedDate={date || null}
              selectedTime={timeSlot || null}
              onSelectDate={(d) => setDate(d)}
              onSelectTime={(t) => setTimeSlot(t)}
            />
          </div>
        </div>

        {/* Everything else about the booking. */}
        <div className="card grid grid-cols-1 gap-5 p-6 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="booking-cadence">Revisit cadence</label>
            <select
              id="booking-cadence"
              className="field"
              value={recurring}
              onChange={(e) => setRecurring(e.target.value as typeof recurring)}
            >
              <option value="none">One time</option>
              <option value="weekly">Every week</option>
              <option value="biweekly">Every two weeks</option>
              <option value="monthly">Monthly</option>
            </select>
            <p className="mt-1 text-xs text-ink-500">
              We save your preference for faster rebook. Billing stays per wash at checkout.
            </p>
          </div>

          <div>
            <label className="label" htmlFor="booking-promo">Promo code (optional)</label>
            <input
              id="booking-promo"
              className="field"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              placeholder="FIRSTWASH"
              autoCapitalize="characters"
            />
            {promoChecking && <p className="mt-1 text-xs text-ink-500">Checking code…</p>}
            {!promoChecking && promo?.reason && <p className="mt-1 text-xs text-red-400">{promo.reason}</p>}
            {!promoChecking && !promo?.reason && discountCents > 0 && (
              <p className="mt-1 text-xs text-gleam">Code applied — {money(discountCents)} off this wash.</p>
            )}
          </div>
        </div>

        {/* Summary + checkout. */}
        <div className="card p-6 space-y-4">
          <h3 className="font-display text-lg">Review &amp; confirm</h3>

          <div className="rounded-xl border border-white/10 bg-ink-800/50 p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-400">{selectedPackage ? selectedPackage.name : 'Standard wash'}</span>
              <span>{money(washCents)}</span>
            </div>
            {selectedAddons.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-sm">
                <span className="text-ink-400">{a.label}</span>
                <span>{money(a.price_cents)}</span>
              </div>
            ))}
            {discountCents > 0 && (
              <div className="flex items-center justify-between text-sm text-gleam">
                <span>Promo {promoCode.trim()}</span>
                <span>−{money(discountCents)}</span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-white/10 pt-2 text-sm">
              <span className="text-ink-400">When</span>
              <span>{date ? `${longLabel(date)} · ${timeSlot}` : 'Pick a date above'}</span>
            </div>
            {selectedVehicle && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-400">Vehicle</span>
                <span>{selectedVehicle.color} {selectedVehicle.make} {selectedVehicle.model}</span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-white/10 pt-2 text-base font-medium">
              <span>Total</span>
              <span className="font-display">{money(priceCents)}</span>
            </div>
          </div>

          {needsWaiver && (
            <div className="rounded-xl border border-white/10 bg-ink-800/50 p-4 space-y-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 shrink-0 accent-gleam"
                  checked={agreeWaiver}
                  onChange={(e) => setAgreeWaiver(e.target.checked)}
                />
                <span className="text-xs text-ink-300">
                  I get that an independent operator performs this service, that my building and Lavo
                  are not liable for vehicle damage, and that the operator may enter the garage or lot
                  to reach my car.
                </span>
              </label>
              <p className="text-[11px] text-ink-500">
                One time thing before your first wash. Details in the{' '}
                <a href="/legal/terms" target="_blank" rel="noreferrer" className="text-gleam underline underline-offset-2">
                  full terms
                </a>.
              </p>
            </div>
          )}

          {err && <div className="text-sm text-red-400">{err}</div>}

          <button
            onClick={book}
            disabled={busy || !vehicleId || !date || (needsWaiver && !agreeWaiver)}
            className="btn-primary w-full"
          >
            {busy
              ? (priceCents > 0 ? 'Redirecting to payment…' : 'Booking…')
              : (priceCents > 0 ? `Pay ${money(priceCents)}` : 'Book free wash')}
          </button>
          <p className="text-[11px] text-ink-400 text-center">
            Secure payment via Stripe. Cancellation available up to 24h before.
          </p>
        </div>
      </div>

      {/* ── Right: packages and add-ons, nothing else ──────────────────── */}
      <aside className="order-1 space-y-6 lg:order-2 lg:sticky lg:top-6">
        <div className="card p-6">
          <h3 className="font-display text-lg">Wash package</h3>
          <div className="mt-4 space-y-2">
            <button
              type="button"
              onClick={() => setPackageId('')}
              className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition ${
                !packageId ? 'border-gleam/60 bg-gleam/5' : 'border-white/10 hover:border-white/20'
              }`}
            >
              <div>
                <div className="text-sm font-medium">Standard wash</div>
                <div className="text-xs text-ink-400">
                  {isPartner && openSlotPriceCents ? 'Priced by the wash type you picked' : 'The operator’s regular wash'}
                </div>
              </div>
              <span className="whitespace-nowrap font-display text-sm">{money(standardWashCents)}</span>
            </button>
            {packages.map((p) => {
              const tiers = parseSizePrices(p.size_prices);
              const checked = packageId === p.id;
              return (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setPackageId(p.id)}
                  className={`flex w-full items-start justify-between gap-3 rounded-xl border px-4 py-3 text-left transition ${
                    checked ? 'border-gleam/60 bg-gleam/5' : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{p.name}</div>
                    {p.description && <div className="mt-0.5 text-xs text-ink-400">{p.description}</div>}
                    <SizePriceList raw={p.size_prices} format={money} className="mt-1 text-xs text-ink-500" />
                  </div>
                  <span className="whitespace-nowrap font-display text-sm">
                    {tiers.length > 0 ? `from ${money(p.price_cents)}` : money(p.price_cents)}
                  </span>
                </button>
              );
            })}
          </div>
          {selectedPackage && parseSizePrices(selectedPackage.size_prices).length > 0 && (
            <p className="mt-2 text-xs text-ink-500">
              Priced by vehicle type — checks out at the starting rate, your operator confirms the rate for your vehicle.
            </p>
          )}
        </div>

        {addons.length > 0 && (
          <div className="card p-6">
            <h3 className="font-display text-lg">Add-ons</h3>
            <p className="mt-1 text-xs text-ink-500">Optional extras for this wash.</p>
            <div className="mt-4 space-y-2">
              {addons.map((a) => {
                const checked = addonIds.includes(a.id);
                const tiers = parseSizePrices(a.size_prices);
                return (
                  <label
                    key={a.id}
                    className={`flex w-full cursor-pointer items-start justify-between gap-3 rounded-xl border px-4 py-3 transition ${
                      checked ? 'border-gleam/60 bg-gleam/5' : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <span className="flex min-w-0 items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 shrink-0 accent-gleam"
                        checked={checked}
                        onChange={(e) =>
                          setAddonIds((prev) =>
                            e.target.checked ? [...prev, a.id] : prev.filter((id) => id !== a.id)
                          )
                        }
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{a.label}</span>
                        <SizePriceList raw={a.size_prices} format={money} className="mt-1 text-xs text-ink-500" />
                      </span>
                    </span>
                    <span className="whitespace-nowrap font-display text-sm">
                      {tiers.length > 0 ? `from ${money(a.price_cents)}` : `+${money(a.price_cents)}`}
                    </span>
                  </label>
                );
              })}
            </div>
            {addons.some((a) => parseSizePrices(a.size_prices).length > 0) && (
              <p className="mt-2 text-xs text-ink-500">
                Add-ons priced by vehicle type check out at the starting rate — your operator confirms
                the rate for your vehicle.
              </p>
            )}
            {initialAddonIds.length > 0 && (
              <p className="mt-2 text-xs text-ink-500">
                Your “on every wash” add-ons are pre-selected. Untick to skip them this time.
              </p>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
