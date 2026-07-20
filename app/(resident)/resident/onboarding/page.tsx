'use client';
import { Logo } from '@/components/Logo';
import { supabaseBrowser } from '@/lib/supabase/client';
import { safeInternalPath } from '@/lib/safe-redirect';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const COLORS = ['White', 'Black', 'Silver', 'Gray', 'Red', 'Blue', 'Green', 'Other'];

export default function ResidentOnboarding() {
  const router = useRouter();
  const sb = supabaseBrowser();

  const [step, setStep] = useState(1);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [buildingId, setBuildingId] = useState('');

  // Step 2 fields
  const [spotLabel, setSpotLabel] = useState('');
  const [phone, setPhone] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [color, setColor] = useState('White');
  const [plate, setPlate] = useState('');
  const [vehiclePhotoUrl, setVehiclePhotoUrl] = useState('');
  const [accessNotes, setAccessNotes] = useState('');
  const [keysAcknowledged, setKeysAcknowledged] = useState(false);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [buildingNotFound, setBuildingNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Prefer the QR-funnel ?b= param, then the slug stashed by the landing page.
    const urlSlug = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('b')
      : null;
    const slug = urlSlug ?? (typeof window !== 'undefined' ? localStorage.getItem('lavo_building_slug') : null);
    sb.from('buildings')
      .select('id, name, address_line1, city, status, slug, wash_day')
      .in('status', ['prospect', 'pilot', 'active'])
      .order('name', { ascending: true })
      .then(({ data }) => {
        const list = data ?? [];
        setBuildings(list);
        if (slug) {
          const match = list.find((b: any) => b.slug === slug);
          if (match) setBuildingId(match.id);
        }
      });
  }, []);

  useEffect(() => {
    const code = typeof window !== 'undefined' ? localStorage.getItem('lavo_referral_code') : null;
    if (!code) return;
    void fetch('/api/referrals/attribute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
      .then((r) => (r.ok ? localStorage.removeItem('lavo_referral_code') : null))
      .catch(() => {});
  }, []);

  const canStep2 = !!buildingId;
  const canFinish = canStep2 && spotLabel.trim() && phone.trim() && make && model && year && color && keysAcknowledged;

  const totalSteps = 2;

  async function finish() {
    setBusy(true);
    setErr(null);

    const res = await fetch('/api/residents/onboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        buildingId,
        spotLabel: spotLabel.trim(),
        phone: phone.trim(),
        vehicleAccessMethod: 'front_desk',
        vehicleAccessNotes: accessNotes || null,
        make,
        model,
        year: parseInt(year, 10),
        color,
        plate: plate || null,
        photoUrl: vehiclePhotoUrl.trim() || null,
      }),
    });

    if (!res.ok) {
      let detail = '';
      try { detail = (await res.json()).error ?? ''; } catch {}
      setErr(`Could not save your info (${res.status}${detail ? ': ' + detail : ''}) — please try again or contact support.`);
      setBusy(false);
      return;
    }

    if (typeof window !== 'undefined') localStorage.removeItem('lavo_building_slug');
    setBusy(false);
    // Hard navigation so the browser makes a fresh full-page request with all cookies,
    // rather than a client-side RSC fetch that can serve a cached redirect.
    // The QR funnel passes ?redirect= so residents land back in scheduling.
    const redirectTarget = safeInternalPath(new URLSearchParams(window.location.search).get('redirect'));
    window.location.href = redirectTarget ?? '/resident/washes';
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Logo />
      <div className="mt-6 text-xs uppercase tracking-[0.18em] text-gleam">
        Step {step} of {totalSteps}
      </div>
      <h1 className="mt-2 font-display text-4xl tracking-tight">
        {step === 1 && 'Select your building'}
        {step === 2 && 'Your vehicle, access, and spot'}
      </h1>

      {/* progress dots */}
      <div className="mt-4 flex gap-1.5">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i < step ? 'bg-gleam' : 'bg-white/10'}`} />
        ))}
      </div>

      {err && <div className="mt-4 text-sm text-red-400">{err}</div>}

      {step === 1 && (
        <div className="mt-8 space-y-4">
          <div>
            <label className="label">Your building</label>
            <select
              className="field"
              value={buildingId}
              onChange={(e) => setBuildingId(e.target.value)}
              required
            >
              <option value="">Select a building…</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>{b.name} — {b.city}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setBuildingNotFound((v) => !v)}
              className="mt-1 text-xs text-gleam underline underline-offset-2 hover:opacity-80"
            >
              Don't see your building?
            </button>

            {buildingNotFound && (
              <div className="mt-3 rounded-xl border border-gleam/30 bg-white/5 p-4 text-sm space-y-3">
                <p className="text-ink-200">
                  Forward this message to your property manager so they can add your building to Lavo:
                </p>
                <div className="rounded-lg bg-ink-800 p-3 text-xs text-ink-300 leading-relaxed whitespace-pre-wrap">
{`Hi,

I'd love to use Lavo for car care at our building, but it isn't listed yet on their resident portal.

Could you reach out to the Lavo team to get our property set up? It's free for the building — residents just pay for the service.

More info for property managers: https://getlavo.io

Thanks!`}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `Hi,\n\nI'd love to use Lavo for car care at our building, but it isn't listed yet on their resident portal.\n\nCould you reach out to the Lavo team to get our property set up? It's free for the building — residents just pay for the service.\n\nMore info for property managers: https://getlavo.io\n\nThanks!`
                      );
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="btn-ghost text-xs px-3 py-1.5"
                  >
                    {copied ? 'Copied!' : 'Copy message'}
                  </button>
                  <a
                    href={`mailto:?subject=Lavo%20Car%20Care%20for%20Our%20Building&body=${encodeURIComponent(`Hi,\n\nI'd love to use Lavo for car care at our building, but it isn't listed yet on their resident portal.\n\nCould you reach out to the Lavo team to get our property set up? It's free for the building — residents just pay for the service.\n\nMore info for property managers: https://getlavo.io\n\nThanks!`)}`}
                    className="btn-ghost text-xs px-3 py-1.5"
                  >
                    Open in email
                  </a>
                </div>
              </div>
            )}
          </div>

          <button disabled={!canStep2} onClick={() => setStep(2)} className="btn-primary w-full">
            Next
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="mt-8 space-y-5">
          <div>
            <label className="label">Where is your parking spot?</label>
            <input className="field" value={spotLabel} onChange={(e) => setSpotLabel(e.target.value)} placeholder="Spot number or details — B-14, green pillar near elevator" required />
          </div>
          <div>
            <label className="label">Phone number</label>
            <input className="field" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" required />
            <p className="mt-1 text-xs text-ink-500">So the operator can call you if needed.</p>
          </div>
          <div>
            <label className="label">Other details <span className="text-ink-500">(optional)</span></label>
            <textarea className="field min-h-[88px]" value={accessNotes} onChange={(e) => setAccessNotes(e.target.value)} placeholder="Anything else the crew should know" />
          </div>

          <div className="card p-4">
            <h3 className="font-display text-lg">Your vehicle</h3>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <div>
                <label className="label">Make</label>
                <input className="field" value={make} onChange={(e) => setMake(e.target.value)} placeholder="Honda" required />
              </div>
              <div>
                <label className="label">Model</label>
                <input className="field" value={model} onChange={(e) => setModel(e.target.value)} placeholder="Civic" required />
              </div>
              <div>
                <label className="label">Year</label>
                <input className="field" type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2022" required />
              </div>
              <div>
                <label className="label">License plate <span className="text-ink-500">(optional)</span></label>
                <input className="field font-mono uppercase" value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} placeholder="ABC1234" />
              </div>
              <div className="col-span-2">
                <label className="label">Color</label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {COLORS.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setColor(c)}
                      className={`chip ${color === c ? 'border-gleam text-gleam' : ''}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div className="col-span-2">
                <label className="label">Vehicle photo URL <span className="text-ink-500">(optional)</span></label>
                <input className="field" value={vehiclePhotoUrl} onChange={(e) => setVehiclePhotoUrl(e.target.value)} placeholder="https://…" />
              </div>
            </div>
          </div>

          <div className="card p-4 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 shrink-0 accent-gleam"
                checked={keysAcknowledged}
                onChange={(e) => setKeysAcknowledged(e.target.checked)}
              />
              <span className="text-sm text-ink-200">
                I understand that I need to leave my keys with the front desk before my scheduled service.
              </span>
            </label>
            <p className="text-xs text-ink-500">
              If keys are not provided to the front desk prior to your service, the operator will not be
              able to service your vehicle and a refund will not be given.
            </p>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="btn-quiet flex-1">Back</button>
            <button disabled={!canFinish || busy} onClick={finish} className="btn-primary flex-1">
              {busy ? 'Saving…' : 'Finish setup'}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
