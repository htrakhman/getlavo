'use client';
import { Logo } from '@/components/Logo';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const COLORS = ['White', 'Black', 'Silver', 'Gray', 'Red', 'Blue', 'Green', 'Other'];

export default function ResidentOnboarding() {
  const router = useRouter();
  const sb = supabaseBrowser();

  const [step, setStep] = useState(1);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [buildingId, setBuildingId] = useState('');
  const [building, setBuilding] = useState<any>(null);

  // Step 2 fields
  const [unit, setUnit] = useState('');
  const [floor, setFloor] = useState('');
  const [spotLabel, setSpotLabel] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [color, setColor] = useState('White');
  const [plate, setPlate] = useState('');
  const [vehiclePhotoUrl, setVehiclePhotoUrl] = useState('');
  const [accessMethod, setAccessMethod] = useState('');
  const [accessNotes, setAccessNotes] = useState('');

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [buildingNotFound, setBuildingNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const slug = typeof window !== 'undefined' ? localStorage.getItem('lavo_building_slug') : null;
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

  useEffect(() => {
    if (!buildingId) { setBuilding(null); return; }
    setBuilding(buildings.find((b) => b.id === buildingId) ?? null);
  }, [buildingId, buildings]);

  const canStep2 = !!buildingId;
  const canFinish = canStep2 && unit && floor && make && model && year && color && accessMethod;

  const totalSteps = 2;

  async function finish() {
    setBusy(true);
    setErr(null);
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setErr('Not signed in'); setBusy(false); return; }

    let resident: any;
    const { data: existing } = await sb.from('residents').select('id').eq('profile_id', user.id).maybeSingle();
    if (existing?.id) {
      const { data, error } = await sb.from('residents').update({
        building_id: buildingId,
        unit_number: unit,
        floor_number: parseInt(floor, 10),
        spot_label: spotLabel || null,
        vehicle_access_method: accessMethod,
        vehicle_access_notes: accessNotes || null,
      }).eq('id', existing.id).select().single();
      if (error) { setErr(error.message); setBusy(false); return; }
      resident = data;
    } else {
      const { data, error } = await sb.from('residents').insert({
        profile_id: user.id,
        building_id: buildingId,
        unit_number: unit,
        floor_number: parseInt(floor, 10),
        spot_label: spotLabel || null,
        vehicle_access_method: accessMethod,
        vehicle_access_notes: accessNotes || null,
      }).select().single();
      if (error) { setErr(error.message); setBusy(false); return; }
      resident = data;
    }

    // Upsert primary vehicle
    const { data: existingVeh } = await sb.from('vehicles').select('id').eq('resident_id', resident.id).maybeSingle();
    const vehiclePayload: any = {
      resident_id: resident.id,
      license_plate: plate || 'UNKNOWN',
      make,
      model,
      year: parseInt(year, 10),
      color,
      is_primary: true,
      photo_url: vehiclePhotoUrl.trim() || null,
    };
    if (existingVeh?.id) {
      await sb.from('vehicles').update(vehiclePayload).eq('id', existingVeh.id);
    } else {
      await sb.from('vehicles').insert(vehiclePayload);
    }

    if (typeof window !== 'undefined') localStorage.removeItem('lavo_building_slug');
    setBusy(false);
    router.push('/resident/washes');
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
                <div className="rounded-lg bg-black/40 p-3 text-xs text-ink-300 leading-relaxed whitespace-pre-wrap">
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
                    className="btn-secondary text-xs px-3 py-1.5"
                  >
                    {copied ? 'Copied!' : 'Copy message'}
                  </button>
                  <a
                    href={`mailto:?subject=Lavo%20Car%20Care%20for%20Our%20Building&body=${encodeURIComponent(`Hi,\n\nI'd love to use Lavo for car care at our building, but it isn't listed yet on their resident portal.\n\nCould you reach out to the Lavo team to get our property set up? It's free for the building — residents just pay for the service.\n\nMore info for property managers: https://getlavo.io\n\nThanks!`)}`}
                    className="btn-secondary text-xs px-3 py-1.5"
                  >
                    Open in email
                  </a>
                </div>
              </div>
            )}
          </div>

          {building && (
            <div className="card border-gleam/30 p-4 text-sm text-ink-200">
              {building.name} · Wash day: {building.wash_day || 'TBD'}
            </div>
          )}

          <button disabled={!canStep2} onClick={() => setStep(2)} className="btn-primary w-full">
            Next
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="mt-8 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Unit number</label>
              <input className="field" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="4B" required />
            </div>
            <div>
              <label className="label">Floor</label>
              <input className="field" type="number" value={floor} onChange={(e) => setFloor(e.target.value)} placeholder="2" required />
            </div>
          </div>
          <div>
            <label className="label">Parking spot label for your crew</label>
            <input className="field" value={spotLabel} onChange={(e) => setSpotLabel(e.target.value)} placeholder="B-14 or green pillar near elevator" />
          </div>

          <div>
            <label className="label">How should the operator access your car?</label>
            <select className="field" value={accessMethod} onChange={(e) => setAccessMethod(e.target.value)} required>
              <option value="">Select…</option>
              <option value="guest_spot">Parked in a guest spot</option>
              <option value="lockbox">Key in lockbox (you will share the code in app chat)</option>
              <option value="home">I will be home</option>
              <option value="doorman">Doorman has the key</option>
              <option value="instructions">Other instructions (describe below)</option>
            </select>
          </div>
          <div>
            <label className="label">Access details <span className="text-ink-500">(optional)</span></label>
            <textarea className="field min-h-[88px]" value={accessNotes} onChange={(e) => setAccessNotes(e.target.value)} placeholder="Gate code, lockbox location, anything else the crew needs" />
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
