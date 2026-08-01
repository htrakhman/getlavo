'use client';
import { money, plateLabel } from '@/lib/format';
import { parseSizePrices } from '@/lib/vehicle-sizes';
import { SizePriceList } from '@/components/SizePriceList';
import { BookingCalendar, longLabel } from '@/components/BookingCalendar';
import { ReadonlyField, EditableField } from '@/components/ResidentField';
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
  // Anything the resident already asked for on every wash starts ticked.
  const [addonIds, setAddonIds] = useState<string[]>(initialAddonIds);
  // Editable in place on this page, so they're state rather than plain props.
  const [spotLabel, setSpotLabel] = useState<string | null>(resident.spotLabel);
  const [accessNotes, setAccessNotes] = useState<string | null>(resident.accessNotes);

  const washCents = selectedPackage
    ? selectedPackage.price_cents
    : standardWashAvailable
      ? bookingType === 'building_day'
        ? basePriceCents
        : (openSlotPriceCents ?? basePriceCents)
      : 0;

  // Nothing to sell: no standard wash rate and no packages. Better to say so
  // than to run a resident through checkout for a $0.00 wash.
  const nothingBookable = !standardWashAvailable && packages.length === 0;

  const selectedAddons = addons.filter((a) => addonIds.includes(a.id));
  const addonCents = selectedAddons.reduce((sum, a) => sum + a.price_cents, 0);

  const priceCents = washCents + addonCents;

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
        <div className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-display text-lg">Pick a date &amp; time</h3>
              <p className="mt-1 text-xs text-ink-500">
                Hourly slots come straight from {operatorName}’s working hours for that day.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(selectedPackage || standardWashAvailable) && (
                <span className="chip text-ink-200">
                  {selectedPackage ? selectedPackage.name : 'Standard wash'} · {money(washCents)}
                </span>
              )}
              {date && (
                <span className="chip text-ink-200">
                  {longLabel(date)} · {timeSlot}
                </span>
              )}
            </div>
          </div>

          {isPartner && standardWashAvailable && openSlotPriceCents && (
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
            disabled={busy || nothingBookable || !vehicleId || !date || (needsWaiver && !agreeWaiver)}
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
