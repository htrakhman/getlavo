'use client';
import { money } from '@/lib/format';
import { calculateFee } from '@/lib/fee';
import { captureEvent } from '@/lib/analytics';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const TIME_SLOTS = ['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'];

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
}: {
  operatorId: string;
  operatorName: string;
  basePriceCents: number;
  openSlotPriceCents: number | null;
  vehicles: { id: string; make: string; model: string; color: string; license_plate: string; is_primary: boolean }[];
  isPartner: boolean;
  partnershipId?: string;
}) {
  const router = useRouter();
  const [bookingType, setBookingType] = useState<'building_day' | 'open_slot'>(
    isPartner ? 'building_day' : 'open_slot'
  );
  const [vehicleId, setVehicleId] = useState(vehicles.find((v) => v.is_primary)?.id ?? vehicles[0]?.id ?? '');
  const [date, setDate] = useState('');
  const [timeSlot, setTimeSlot] = useState(TIME_SLOTS[0]);
  const [recurring, setRecurring] = useState<'none' | 'weekly' | 'biweekly' | 'monthly'>('none');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState('');

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('lavo_promo_code') : null;
    if (stored) setPromoCode(stored);
  }, []);

  const priceCents = bookingType === 'building_day'
    ? basePriceCents
    : (openSlotPriceCents ?? basePriceCents);

  const { fee: feeCents } = calculateFee(priceCents);

  async function book() {
    if (!vehicleId || !date) { setErr('Please select a vehicle and date'); return; }
    setBusy(true); setErr(null);
    const res = await fetch('/api/bookings/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operatorId,
        vehicleId,
        scheduledFor: date,
        timeSlot,
        bookingType,
        partnershipId: partnershipId ?? undefined,
        recurringCadence: recurring === 'none' ? undefined : recurring,
        promoCode: promoCode.trim() || undefined,
      }),
    });
    const j = await res.json();
    if (!res.ok) { setErr(j.error ?? 'Booking failed'); setBusy(false); return; }
    captureEvent('booking_checkout_started', { operatorId, free: !j.checkoutUrl });
    if (j.checkoutUrl) {
      window.location.href = j.checkoutUrl;
    } else {
      router.push('/resident/bookings');
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

      {vehicles.length > 0 ? (
        <div>
          <label className="label">Vehicle</label>
          <select className="field" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.color} {v.make} {v.model} · {v.license_plate}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="text-sm text-red-400">Please add a vehicle in your profile first.</div>
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
      </div>

      <div>
        <label className="label">Date</label>
        <input
          className="field"
          type="date"
          min={isoDateMin()}
          max={isoDateMax()}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div>
        <label className="label">Preferred time</label>
        <select className="field" value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)}>
          {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="rounded-xl border border-white/10 bg-ink-800/50 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink-400">Wash total</span>
          <span>{money(priceCents)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-ink-500">
          <span>Includes platform fee</span>
          <span>{money(feeCents)} to Lavo · {money(priceCents - feeCents)} to your operator</span>
        </div>
      </div>

      {err && <div className="text-sm text-red-400">{err}</div>}

      <button
        onClick={book}
        disabled={busy || !vehicleId || !date}
        className="btn-primary w-full"
      >
        {busy ? 'Redirecting to payment…' : `Pay ${money(priceCents)}`}
      </button>
      <p className="text-[11px] text-ink-400 text-center">Secure payment via Stripe. Cancellation available up to 24h before.</p>
    </div>
  );
}
