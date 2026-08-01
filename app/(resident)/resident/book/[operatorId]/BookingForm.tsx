'use client';
import { money, plateLabel } from '@/lib/format';
import { parseSizePrices, normalizeSize, priceForVehicle, sizeLabel, type VehicleSizeId } from '@/lib/vehicle-sizes';
import { SizePriceList } from '@/components/SizePriceList';
import { VehicleSizePicker } from '@/components/VehicleSizePicker';
import { BookingCalendar, longLabel } from '@/components/BookingCalendar';
import { ReadonlyField, EditableField } from '@/components/ResidentField';
import type { AvailabilityDay } from '@/components/DayTimePicker';
import { captureEvent } from '@/lib/analytics';
import { useState, useEffect, useMemo, useRef } from 'react';
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

/**
 * Bring a section to the top of the viewport once React has painted the
 * layout change that prompted the move (collapsing the calendar shortens the
 * page, so scrolling before the repaint lands in the wrong place).
 */
function scrollSectionIntoView(ref: { current: HTMLElement | null }) {
  if (typeof window === 'undefined') return;
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  requestAnimationFrame(() => {
    ref.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
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
  standardWashAvailable,
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
  /** False when the operator has published no standard wash rate — packages only. */
  standardWashAvailable: boolean;
  vehicles: {
    id: string;
    make: string;
    model: string;
    color: string;
    year?: number | null;
    license_plate: string;
    notes?: string | null;
    is_primary: boolean;
    /** Null on vehicles added before vehicle-type pricing — asked for below. */
    size?: string | null;
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
  // on-demand price below with that package's price. An empty selection means
  // the standard wash, so it can only be the default when there is one —
  // otherwise the form would open on a wash the operator hasn't priced.
  const [packageId, setPackageId] = useState(standardWashAvailable ? '' : (packages[0]?.id ?? ''));
  const selectedPackage = packages.find((p) => p.id === packageId) ?? null;
  // A slot picked on the QR landing calendar arrives via query params.
  const preselectedDate = useMemo(
    () => (initialDate && initialDate >= isoDateMin() && initialDate <= isoDateMax() ? initialDate : ''),
    [initialDate]
  );
  const [date, setDate] = useState(preselectedDate);
  const [timeSlot, setTimeSlot] = useState(() =>
    initialTimeSlot && TIME_SLOTS.includes(initialTimeSlot) ? initialTimeSlot : TIME_SLOTS[0]
  );

  // Once a date is chosen the month grid is dead weight, so it folds into a
  // one-line summary and the page scrolls the times — then the details to
  // confirm — up into view. A slot carried over from the landing page arrives
  // already picked, so it starts folded.
  const [calendarCollapsed, setCalendarCollapsed] = useState(Boolean(preselectedDate));
  const calendarRef = useRef<HTMLDivElement | null>(null);
  const reviewRef = useRef<HTMLDivElement | null>(null);

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
    // Snap stale selections to the live schedule — and reopen the grid, since
    // there's no longer a date for the collapsed summary to show.
    if (date && !availability.some((d) => d.date === date && d.slots.length > 0)) {
      setDate('');
      setCalendarCollapsed(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availability]);

  // No day is picked for the resident on load — the calendar opens empty and
  // waits for a real choice, so nobody checks out on a date they never chose.

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
  // Anything the resident already asked for on every wash starts ticked.
  const [addonIds, setAddonIds] = useState<string[]>(initialAddonIds);
  // Editable in place on this page, so they're state rather than plain props.
  const [spotLabel, setSpotLabel] = useState<string | null>(resident.spotLabel);
  const [accessNotes, setAccessNotes] = useState<string | null>(resident.accessNotes);

  // The vehicle's type is what picks the tier on every price below. It lives on
  // the vehicle, but it's answerable right here for a car added before the
  // field existed, so the quote updates the moment it's answered rather than
  // after a round trip to the vehicle page.
  const [sizeById, setSizeById] = useState<Record<string, VehicleSizeId>>(() => {
    const seed: Record<string, VehicleSizeId> = {};
    for (const v of vehicles) {
      const s = normalizeSize(v.size);
      if (s) seed[v.id] = s;
    }
    return seed;
  });
  const vehicleSize = sizeById[vehicleId] ?? null;

  const washCents = selectedPackage
    ? priceForVehicle(selectedPackage, vehicleSize)
    : standardWashAvailable
      ? bookingType === 'building_day'
        ? basePriceCents
        : (openSlotPriceCents ?? basePriceCents)
      : 0;

  // Nothing to sell: no standard wash rate and no packages. Better to say so
  // than to run a resident through checkout for a $0.00 wash.
  const nothingBookable = !standardWashAvailable && packages.length === 0;

  const selectedAddons = addons
    .filter((a) => addonIds.includes(a.id))
    .map((a) => ({ ...a, price_cents: priceForVehicle(a, vehicleSize) }));
  const addonCents = selectedAddons.reduce((sum, a) => sum + a.price_cents, 0);

  const priceCents = washCents + addonCents;

  async function book() {
    if (!vehicleId || !date) { setErr('Please select a vehicle and date'); return; }
    if (!vehicleSize) { setErr('Please choose your vehicle type — it sets the price for your wash.'); return; }
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

        {/* The calendar — the centerpiece of the page, and the first thing
            the resident acts on. */}
        <div ref={calendarRef} className="card relative scroll-mt-4 overflow-hidden p-6">
          {/* A soft accent wash behind the header so the booking card reads as
              the centrepiece rather than one panel among many. */}
          <div className="pointer-events-none absolute inset-x-0 -top-8 h-48 bg-gleam-fade" aria-hidden />

          <div className="relative">
            <div className="flex items-start gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-gleam/25 bg-gleam/10 text-gleam">
                <CalendarGlyph />
              </span>
              <div>
                <h3 className="font-display text-xl font-semibold tracking-tight">Pick a date &amp; time</h3>
                <p className="mt-1 text-xs leading-relaxed text-ink-500">
                  Hourly slots come straight from {operatorName}’s working hours for that day.
                </p>
              </div>
            </div>

            {/* The two choices the resident is actually making, big enough to
                read at a glance and obviously incomplete until both are set. */}
            <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
              {(selectedPackage || standardWashAvailable) && (
                <SummaryTile
                  label="Your wash"
                  icon={<SparkleGlyph />}
                  value={selectedPackage ? selectedPackage.name : 'Standard wash'}
                  meta={money(washCents)}
                  filled
                />
              )}
              <SummaryTile
                label="When"
                icon={<ClockGlyph />}
                value={date ? longLabel(date) : 'Choose a date below'}
                meta={date && timeSlot ? timeSlot : undefined}
                filled={!!date && !!timeSlot}
              />
            </div>
          </div>

          {isPartner && standardWashAvailable && openSlotPriceCents && (
            <div className="relative mt-6">
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

          <div className="relative mt-6">
            <BookingCalendar
              days={calendarDays}
              selectedDate={date || null}
              selectedTime={timeSlot || null}
              collapsed={calendarCollapsed}
              onSelectDate={(d) => {
                setDate(d);
                setCalendarCollapsed(true);
                // Pull the (now short) calendar to the top so the times sit
                // right under the thumb instead of below a month of squares.
                scrollSectionIntoView(calendarRef);
              }}
              onSelectTime={(t) => {
                setTimeSlot(t);
                // Slot settled — jump to the summary they need to confirm.
                if (t !== timeSlot) scrollSectionIntoView(reviewRef);
              }}
              onExpand={() => {
                setCalendarCollapsed(false);
                scrollSectionIntoView(calendarRef);
              }}
            />
          </div>
        </div>

        {/* Where the wash happens — every box already filled from the account,
            the ones the resident owns editable right here. */}
        <div className="card p-6">
          <h3 className="font-display text-lg">Where we’ll wash</h3>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ReadonlyField label="Building" value={resident.buildingName} />
            <ReadonlyField label="Unit" value={resident.unitNumber} />
            <div className="sm:col-span-2">
              <ReadonlyField label="Building address" value={resident.buildingAddress} />
            </div>

            <EditableField
              label="Parking spot"
              field="spotLabel"
              value={spotLabel}
              onChange={setSpotLabel}
              placeholder="e.g. P2-118"
              hint="Where the operator will find your car."
              emptyWarning="Add your spot so the operator can find your car."
            />

            <div>
              <div className="flex items-center justify-between gap-2">
                <label className="label mb-0" htmlFor="booking-vehicle">Vehicle</label>
                <Link href="/resident/vehicle" className="text-xs text-gleam hover:underline underline-offset-2">
                  Manage
                </Link>
              </div>
              {vehicles.length > 0 ? (
                <>
                  <select
                    id="booking-vehicle"
                    className="field mt-1.5"
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
                  <p className="mt-1 text-xs text-ink-500">
                    {vehicles.length > 1
                      ? 'Your primary vehicle is pre-selected.'
                      : 'Sent to the operator with the job.'}
                  </p>
                </>
              ) : (
                <div className="mt-1.5 rounded-xl border border-red-400/30 bg-red-400/5 px-4 py-3 text-sm text-red-400">
                  <Link href="/resident/vehicle" className="underline underline-offset-2">
                    Add a vehicle
                  </Link>{' '}
                  to book a wash.
                </div>
              )}
            </div>

            {selectedVehicle && (
              <>
                {/* The one vehicle detail that moves the price, so it sits
                    directly under the vehicle it describes. Answered here when
                    it's missing — a resident is never sent off to their profile
                    mid-booking — and read-only once it's on file. Unanswered it
                    takes the full row, because the three silhouettes need the
                    width; answered it's an ordinary field like the rest. */}
                {vehicleSize ? (
                  <ReadonlyField
                    label="Vehicle type"
                    value={sizeLabel(vehicleSize)}
                    lockedNote="Edit under Manage vehicles"
                    hint="Sets your rate when this operator prices by vehicle type."
                  />
                ) : (
                  <div className="sm:col-span-2">
                    <VehicleSizeSetter
                      vehicleId={selectedVehicle.id}
                      onSaved={(size) => setSizeById((prev) => ({ ...prev, [selectedVehicle.id]: size }))}
                    />
                  </div>
                )}

                <ReadonlyField
                  label="Make & model"
                  value={`${selectedVehicle.year ? `${selectedVehicle.year} ` : ''}${selectedVehicle.make} ${selectedVehicle.model}`}
                  lockedNote="Edit under Manage vehicles"
                />
                <ReadonlyField label="Color" value={selectedVehicle.color} lockedNote="Edit under Manage vehicles" />
                <ReadonlyField
                  label="License plate"
                  value={plateLabel(selectedVehicle.license_plate)}
                  lockedNote="Edit under Manage vehicles"
                />
                <ReadonlyField
                  label="Vehicle notes"
                  value={selectedVehicle.notes ?? null}
                  lockedNote="Edit under Manage vehicles"
                />
              </>
            )}

            <div className="sm:col-span-2">
              <EditableField
                label="Access notes for the operator"
                field="vehicleAccessNotes"
                value={accessNotes}
                onChange={setAccessNotes}
                multiline
                placeholder="Garage code, gate, elevator side — anything the crew should know"
                hint="Saved to your profile and shown to the operator on every wash."
              />
            </div>

            <div className="sm:col-span-2">
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
          </div>
        </div>

        {/* Summary + checkout. */}
        <div ref={reviewRef} className="card scroll-mt-4 p-6 space-y-4">
          <h3 className="font-display text-lg">Review &amp; confirm</h3>

          <div className="rounded-xl border border-white/10 bg-ink-800/50 p-4 space-y-2">
            {/* Where a line's price came from a vehicle tier, the tier is named
                on the line. The receipt should explain its own numbers — "why
                is this $95" is answered here rather than after the wash. */}
            <div className="flex items-start justify-between gap-3 text-sm">
              <span className="text-ink-400">
                {selectedPackage ? selectedPackage.name : 'Standard wash'}
                {selectedPackage && vehicleSize && parseSizePrices(selectedPackage.size_prices).length > 0 && (
                  <span className="block text-xs text-ink-500">{sizeLabel(vehicleSize)} rate</span>
                )}
              </span>
              <span>{money(washCents)}</span>
            </div>
            {selectedAddons.map((a) => (
              <div key={a.id} className="flex items-start justify-between gap-3 text-sm">
                <span className="text-ink-400">
                  {a.label}
                  {vehicleSize && parseSizePrices(a.size_prices).length > 0 && (
                    <span className="block text-xs text-ink-500">{sizeLabel(vehicleSize)} rate</span>
                  )}
                </span>
                <span>{money(a.price_cents)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-white/10 pt-2 text-sm">
              <span className="text-ink-400">When</span>
              <span>{date ? `${longLabel(date)} · ${timeSlot}` : 'Pick a date above'}</span>
            </div>
            {selectedVehicle && (
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-ink-400">Vehicle</span>
                <span className="text-right">
                  {selectedVehicle.color} {selectedVehicle.make} {selectedVehicle.model}
                  {/* The type is on the receipt because it's an input to the
                      price, not decoration — a resident checking the total
                      should be able to see which tier they were charged at. */}
                  {vehicleSize && <span className="block text-xs text-ink-500">{sizeLabel(vehicleSize)}</span>}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-400">Where</span>
              <span>
                {resident.buildingName}
                {spotLabel ? ` · spot ${spotLabel}` : ''}
              </span>
            </div>
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
            disabled={busy || nothingBookable || !vehicleId || !vehicleSize || !date || (needsWaiver && !agreeWaiver)}
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
          {nothingBookable && (
            <p className="mt-3 text-sm text-ink-300">
              {operatorName} hasn’t published their pricing yet, so there’s nothing to book here
              right now. Check back shortly.
            </p>
          )}
          <div className="mt-4 space-y-2">
            {/* The standard wash is the operator's own regular-wash rate, not the
                cheapest thing on their menu — an operator who hasn't set one
                simply doesn't offer it (see lib/wash-pricing.ts). */}
            {standardWashAvailable && (
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
            )}
            {packages.map((p) => {
              const tiers = parseSizePrices(p.size_prices);
              const checked = packageId === p.id;
              // With the vehicle known there is nothing to say "from" about —
              // this is the price this resident pays for this car.
              const price = priceForVehicle(p, vehicleSize);
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
                    {tiers.length > 0 && !vehicleSize ? `from ${money(price)}` : money(price)}
                  </span>
                </button>
              );
            })}
          </div>
          {selectedPackage && parseSizePrices(selectedPackage.size_prices).length > 0 && vehicleSize && (
            <p className="mt-2 text-xs text-ink-500">
              Priced for your {sizeLabel(vehicleSize).toLowerCase()} — that’s the rate you’re charged, no
              confirmation needed.
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
                const price = priceForVehicle(a, vehicleSize);
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
                      {tiers.length > 0 && !vehicleSize ? `from ${money(price)}` : `+${money(price)}`}
                    </span>
                  </label>
                );
              })}
            </div>
            {vehicleSize && addons.some((a) => parseSizePrices(a.size_prices).length > 0) && (
              <p className="mt-2 text-xs text-ink-500">
                Add-ons priced by vehicle type show your {sizeLabel(vehicleSize).toLowerCase()} rate.
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

/**
 * The vehicle-type question for a car that predates vehicle-type pricing.
 *
 * It saves to the vehicle itself rather than to the booking: the answer is a
 * fact about the car, so answering it once here prices every future wash too.
 * Until it's answered the prices on this page are the operator's starting
 * rates, and checkout is blocked — quoting a sedan price for a pickup and
 * settling up afterwards is exactly the gap this closes.
 */
function VehicleSizeSetter({
  vehicleId,
  onSaved,
}: {
  vehicleId: string;
  onSaved: (size: VehicleSizeId) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save(size: VehicleSizeId) {
    setBusy(true);
    setErr(null);
    const res = await fetch('/api/residents/vehicles', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: vehicleId, size }),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      setErr('Couldn’t save your vehicle type — please try again.');
      return;
    }
    onSaved(size);
  }

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
      <VehicleSizePicker
        value={null}
        onChange={save}
        disabled={busy}
        hint="Your operator prices by vehicle size. Pick yours and the prices below update — we’ll save it to your vehicle."
      />
      {err && <p className="mt-2 text-xs text-red-400">{err}</p>}
    </div>
  );
}

/**
 * One half of the booking summary strip above the calendar — the wash on the
 * left, the date and time on the right. An unfilled tile stays dashed and grey
 * so a half-finished booking is obvious without reading a word.
 */
function SummaryTile({
  label,
  icon,
  value,
  meta,
  filled,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  meta?: string;
  filled: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border px-3.5 py-3 transition ${
        filled
          ? 'border-gleam/30 bg-gleam/[0.07] shadow-glow'
          : 'border-dashed border-ink-600 bg-white/[0.03]'
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
          filled ? 'border-gleam/25 bg-gleam/10 text-gleam' : 'border-white/10 bg-white/5 text-ink-500'
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] uppercase tracking-[0.16em] text-ink-500">{label}</span>
        <span
          className={`block truncate font-display text-sm font-semibold ${
            filled ? 'text-ink-100' : 'text-ink-400'
          }`}
        >
          {value}
        </span>
      </span>
      {meta && (
        <span className="ml-auto shrink-0 font-display text-sm font-semibold tabular-nums text-gleam">
          {meta}
        </span>
      )}
    </div>
  );
}

function CalendarGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
         strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
      <circle cx="8.5" cy="15" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ClockGlyph() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
         strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 1.8" />
    </svg>
  );
}

function SparkleGlyph() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
         strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3.5l1.9 4.9 4.9 1.9-4.9 1.9L12 17.1l-1.9-4.9L5.2 10.3l4.9-1.9L12 3.5z" />
      <path d="M18.5 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8z" />
    </svg>
  );
}
