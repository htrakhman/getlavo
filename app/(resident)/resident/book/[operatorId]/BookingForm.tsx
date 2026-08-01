'use client';
import { money, plateLabel } from '@/lib/format';
import { parseSizePrices } from '@/lib/vehicle-sizes';
import { SizePriceList } from '@/components/SizePriceList';
import { DayTimePicker, type AvailabilityDay } from '@/components/DayTimePicker';
import { resolveWashPriceCents } from '@/lib/building-price';
import { captureEvent } from '@/lib/analytics';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const TIME_SLOTS = [
  '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM',
];

function isoDateMin() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function isoDateMax() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
}

export function BookingForm({
  operatorId,
  operatorName,
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
  buildingPriceCents,
  jobDetails,
}: {
  operatorId: string;
  operatorName: string;
  basePriceCents: number;
  openSlotPriceCents: number | null;
  /** The rate the operator agreed for this building, when one is set. */
  buildingPriceCents: number | null;
  jobDetails: {
    buildingName: string | null;
    address: string | null;
    cityLine: string | null;
    unitNumber: string | null;
    spotLabel: string | null;
    floorNumber: number | null;
    accessNotes: string | null;
  };
  vehicles: { id: string; make: string; model: string; color: string; license_plate: string; is_primary: boolean }[];
  isPartner: boolean;
  partnershipId?: string;
  initialDate?: string;
  initialTimeSlot?: string;
  waiverAccepted: boolean;
  addons: { id: string; label: string; price_cents: number; size_prices?: unknown }[];
  initialAddonIds: string[];
  packages: { id: string; name: string; description: string | null; price_cents: number; size_prices?: unknown }[];
}) {
  const router = useRouter();
  const [bookingType, setBookingType] = useState<'building_day' | 'open_slot'>(
    isPartner ? 'building_day' : 'open_slot'
  );
  const [vehicleId, setVehicleId] = useState(vehicles.find((v) => v.is_primary)?.id ?? vehicles[0]?.id ?? '');
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

  // Live availability (operator hours + agreed wash days + capacity). When
  // present, the date/time pickers are constrained to it; otherwise the
  // free-form inputs below remain as a fallback.
  const [availability, setAvailability] = useState<AvailabilityDay[] | null>(null);

  useEffect(() => {
    fetch(`/api/availability?operatorId=${encodeURIComponent(operatorId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const days = (d?.days ?? []) as AvailabilityDay[];
        // Only switch to the live calendar view once there's at least one
        // bookable day — otherwise keep the free-form fallback inputs.
        if (days.some((day) => day.slots.length > 0)) setAvailability(days);
      })
      .catch(() => {});
  }, [operatorId]);

  const availableDay = availability?.find((d) => d.date === date) ?? null;
  const slotOptions = availableDay ? availableDay.slots : TIME_SLOTS;

  useEffect(() => {
    if (!availability) return;
    // Snap stale selections to the live schedule.
    if (date && !availability.some((d) => d.date === date)) setDate('');
    if (availableDay && !availableDay.slots.includes(timeSlot)) setTimeSlot(availableDay.slots[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availability, date]);
  const needsWaiver = !waiverAccepted;
  const [agreeWaiver, setAgreeWaiver] = useState(false);
  const [recurring, setRecurring] = useState<'none' | 'weekly' | 'biweekly' | 'monthly'>('none');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState('');
  // Anything the resident already asked for on every wash starts ticked.
  const [addonIds, setAddonIds] = useState<string[]>(initialAddonIds);
  const [residentNotes, setResidentNotes] = useState('');

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('lavo_promo_code') : null;
    if (stored) setPromoCode(stored);
  }, []);

  const washCents = resolveWashPriceCents({
    packagePriceCents: selectedPackage?.price_cents,
    buildingPriceCents,
    bookingType,
    basePriceCents,
    openSlotPriceCents,
  });
  // The standard-wash tile quotes the same rate with no package chosen.
  const standardWashCents = resolveWashPriceCents({
    buildingPriceCents,
    bookingType,
    basePriceCents,
    openSlotPriceCents,
  });

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
        body: JSON.stringify({ code, operatorId, bookingType, packageId: packageId || undefined }),
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
  }, [promoCode, operatorId, bookingType, packageId]);

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
          residentNotes: residentNotes.trim() || undefined,
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

  return (
    <div className="card sticky top-6 h-fit p-6 space-y-5">
      <h3 className="font-display text-xl">Book a wash</h3>

      {isPartner && openSlotPriceCents && (
        <div>
          <label className="label">Booking type</label>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setBookingType('building_day')}
              className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                bookingType === 'building_day' ? 'border-gleam/60 bg-gleam/5' : 'border-white/10 hover:border-white/20'
              }`}
            >
              <div>
                <div className="text-sm font-medium">Building wash day</div>
                <div className="text-xs text-ink-400">Scheduled visit — best price</div>
              </div>
              <span className="text-gleam font-display">{money(basePriceCents)}</span>
            </button>
            <button
              type="button"
              onClick={() => setBookingType('open_slot')}
              className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
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

      {packages.length > 0 && (
        <div>
          <label className="label">Wash package</label>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setPackageId('')}
              className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                !packageId ? 'border-gleam/60 bg-gleam/5' : 'border-white/10 hover:border-white/20'
              }`}
            >
              <div>
                <div className="text-sm font-medium">Standard wash</div>
                <div className="text-xs text-ink-400">
                  {isPartner && openSlotPriceCents ? 'Priced by booking type above' : 'The operator’s regular wash'}
                </div>
              </div>
              <span className="font-display">{money(standardWashCents)}</span>
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
            <p className="mt-1 text-xs text-ink-500">
              Priced by vehicle type — checks out at the starting rate, your operator confirms the rate for your vehicle.
            </p>
          )}
        </div>
      )}

      {vehicles.length > 0 ? (
        <div>
          <label className="label">Vehicle</label>
          <select className="field" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.color} {v.make} {v.model}{plateLabel(v.license_plate) ? ` · ${plateLabel(v.license_plate)}` : ''}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="text-sm text-red-400">Please add a vehicle in your profile first.</div>
      )}

      {addons.length > 0 && (
        <div>
          <label className="label">Add-ons (optional)</label>
          <div className="space-y-2">
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
            <p className="mt-1 text-xs text-ink-500">
              Add-ons priced by vehicle type check out at the starting rate — your operator confirms
              the rate for your vehicle.
            </p>
          )}
          {initialAddonIds.length > 0 && (
            <p className="mt-1 text-xs text-ink-500">
              Your “on every wash” add-ons are pre-selected. Untick to skip them this time.
            </p>
          )}
        </div>
      )}

      <div>
        <label className="label">Revisit cadence</label>
        <select className="field" value={recurring} onChange={(e) => setRecurring(e.target.value as typeof recurring)}>
          <option value="none">One time</option>
          <option value="weekly">Every week</option>
          <option value="biweekly">Every two weeks</option>
          <option value="monthly">Monthly</option>
        </select>
        <p className="mt-1 text-xs text-ink-500">We save your preference for faster rebook. Billing stays per wash at checkout.</p>
      </div>

      <div>
        <label className="label">Promo code (optional)</label>
        <input
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

      <div>
        <label className="label">Date & time</label>
        {availability ? (
          <DayTimePicker
            days={availability}
            selectedDate={date || null}
            selectedTime={timeSlot || null}
            onSelectDate={(d) => setDate(d)}
            onSelectTime={(t) => setTimeSlot(t)}
          />
        ) : (
          <div className="space-y-3">
            <input
              className="field"
              type="date"
              min={isoDateMin()}
              max={isoDateMax()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <select className="field" value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)}>
              {slotOptions.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        )}
      </div>

      <div>
        <label className="label">Anything else the crew should know (optional)</label>
        <textarea
          className="field min-h-[72px]"
          value={residentNotes}
          onChange={(e) => setResidentNotes(e.target.value)}
          maxLength={2000}
          placeholder="Dent on the rear bumper, please skip the wheels…"
        />
      </div>

      {/* What gets handed to the operator with this job. Shown so the resident
          can catch a wrong spot or a missing gate instruction before paying. */}
      <div className="rounded-xl border border-white/10 bg-ink-800/50 p-4">
        <div className="text-xs uppercase tracking-widest text-ink-400">What the operator gets</div>
        <dl className="mt-3 space-y-1.5 text-sm">
          {jobDetails.buildingName && (
            <div className="flex justify-between gap-3">
              <dt className="text-ink-400">Building</dt>
              <dd className="text-right">{jobDetails.buildingName}</dd>
            </div>
          )}
          {jobDetails.address && (
            <div className="flex justify-between gap-3">
              <dt className="text-ink-400">Address</dt>
              <dd className="text-right">
                {jobDetails.address}
                {jobDetails.cityLine && <span className="block text-xs text-ink-500">{jobDetails.cityLine}</span>}
              </dd>
            </div>
          )}
          {jobDetails.unitNumber && (
            <div className="flex justify-between gap-3">
              <dt className="text-ink-400">Unit</dt>
              <dd className="text-right">{jobDetails.unitNumber}</dd>
            </div>
          )}
          <div className="flex justify-between gap-3">
            <dt className="text-ink-400">Parking spot</dt>
            <dd className={`text-right ${jobDetails.spotLabel ? '' : 'text-amber-600'}`}>
              {jobDetails.spotLabel ?? 'Not set'}
              {jobDetails.floorNumber != null && jobDetails.spotLabel && (
                <span className="text-ink-500"> · Floor {jobDetails.floorNumber}</span>
              )}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-400">Keys</dt>
            <dd className="text-right">Front desk</dd>
          </div>
          {jobDetails.accessNotes && (
            <div className="flex justify-between gap-3">
              <dt className="text-ink-400">Access notes</dt>
              <dd className="text-right">{jobDetails.accessNotes}</dd>
            </div>
          )}
        </dl>
        <p className="mt-3 text-[11px] text-ink-500">
          Pulled from your profile.{' '}
          <a href="/resident/vehicle" className="text-gleam underline underline-offset-2">
            Update spot &amp; access
          </a>
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-ink-800/50 p-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink-400">Wash</span>
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
        <div className="flex items-center justify-between border-t border-white/10 pt-2 text-sm font-medium">
          <span>Total</span>
          <span>{money(priceCents)}</span>
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
      <p className="text-[11px] text-ink-400 text-center">Secure payment via Stripe. Cancellation available up to 24h before.</p>
    </div>
  );
}
