'use client';
import { Logo } from '@/components/Logo';
import { AddressAutocomplete, type ParsedAddress } from '@/components/AddressAutocomplete';
import { PlacesAutocomplete, type PlacePick } from '@/components/PlacesAutocomplete';
import { supabaseBrowser } from '@/lib/supabase/client';
import { generateSlug } from '@/lib/geo';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Step = 1 | 2;

function parseFormattedAddress(formattedAddress: string, buildingName: string) {
  let addr = formattedAddress;
  const prefix = buildingName ? buildingName + ', ' : '';
  if (prefix && addr.startsWith(prefix)) addr = addr.slice(prefix.length);
  const parts = addr.split(',').map((s) => s.trim()).filter(Boolean);
  const filtered = parts.filter((p) => !/^(usa|united states)$/i.test(p));
  const street = filtered[0] ?? '';
  const city = filtered[1] ?? '';
  const stateZip = filtered[2] ?? '';
  const m = stateZip.match(/^([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/);
  return {
    street,
    city,
    state: m?.[1] ?? stateZip.split(' ')[0] ?? '',
    postal: m?.[2] ?? '',
  };
}

export default function OnboardingForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Step 1: property details
  const [name, setName]     = useState('');
  const [placeId, setPlaceId] = useState('');
  const [addr1, setAddr1]   = useState('');
  const [addr2, setAddr2]   = useState('');
  const [city, setCity]     = useState('');
  const [region, setRegion] = useState('');
  const [postal, setPostal] = useState('');
  const [units, setUnits]   = useState<number | ''>('');
  const [lat, setLat]       = useState<number | null>(null);
  const [lng, setLng]       = useState<number | null>(null);

  function handleAddressSelect(a: ParsedAddress) {
    if (a.street) setAddr1(a.street);
    if (a.city) setCity(a.city);
    if (a.state) setRegion(a.state);
    if (a.postal) setPostal(a.postal);
    if (a.lat !== null) setLat(a.lat);
    if (a.lng !== null) setLng(a.lng);
  }

  function handlePlaceSelect(a: ParsedAddress) {
    if (a.name) setName(a.name);
    if (a.street) setAddr1(a.street);
    if (a.city) setCity(a.city);
    if (a.state) setRegion(a.state);
    if (a.postal) setPostal(a.postal);
    if (a.lat !== null) setLat(a.lat);
    if (a.lng !== null) setLng(a.lng);
  }

  async function handlePickFromPlaces(pick: PlacePick) {
    setName(pick.mainText);
    setPlaceId(pick.placeId ?? '');
    try {
      const res = await fetch('/api/places/details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId: pick.placeId }),
      });
      if (res.ok) {
        const { place } = await res.json();
        const parsed = parseFormattedAddress(place.formattedAddress ?? '', pick.mainText);
        if (parsed.street) setAddr1(parsed.street);
        if (parsed.city) setCity(parsed.city);
        if (parsed.state) setRegion(parsed.state);
        if (parsed.postal) setPostal(parsed.postal);
        if (typeof place.lat === 'number') setLat(place.lat);
        if (typeof place.lng === 'number') setLng(place.lng);
      }
    } catch {
      // user can fill in address manually
    }
  }

  async function finish() {
    setBusy(true); setErr(null);
    const sb = supabaseBrowser();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setErr('Not authenticated'); setBusy(false); return; }

    const slug = generateSlug(name, city);

    const { data: building, error: be } = await sb.from('buildings').insert({
      manager_id: user.id,
      name,
      slug,
      address_line1: addr1,
      address_line2: addr2 || null,
      city,
      region,
      postal_code: postal,
      total_units: units || null,
      lat: lat ?? null,
      lng: lng ?? null,
      onboarded_at: new Date().toISOString(),
      google_place_id: placeId || null,
    }).select().single();

    if (be || !building) {
      setErr(be?.message ?? 'Failed to create building');
      setBusy(false);
      return;
    }

    router.push('/building/share');
  }

  const totalSteps = 2;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Logo />
      <div className="mt-12">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-gleam">
          Step {step} of {totalSteps}
        </div>
        <h1 className="mt-2 font-display text-4xl tracking-tight">
          {step === 1 && 'Tell us about your building'}
          {step === 2 && 'Review and finish'}
        </h1>

        {/* ── Step 1: Property details ── */}
        {step === 1 && (
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="label">Building name</label>
              {name ? (
                <div className="flex items-center gap-2">
                  <div className="field flex-1 text-ink-200">{name}</div>
                  <button type="button" className="btn-quiet shrink-0 px-3 text-xs" onClick={() => { setName(''); setPlaceId(''); }}>
                    Change
                  </button>
                </div>
              ) : (
                <PlacesAutocomplete onPick={handlePickFromPlaces} placeholder="The Beacon Residences" />
              )}
            </div>
            <div className="md:col-span-2">
              <label className="label">Street address</label>
              <AddressAutocomplete
                mode="address"
                value={addr1}
                onChange={setAddr1}
                onSelect={handleAddressSelect}
                placeholder="123 Main St"
              />
            </div>
            <div className="md:col-span-2">
              <label className="label">Suite / Unit (optional)</label>
              <input className="field" value={addr2} onChange={(e) => setAddr2(e.target.value)} />
            </div>
            <div>
              <label className="label">City</label>
              <input className="field" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div>
              <label className="label">State</label>
              <input className="field" value={region} onChange={(e) => setRegion(e.target.value)} />
            </div>
            <div>
              <label className="label">ZIP</label>
              <input className="field" value={postal} onChange={(e) => setPostal(e.target.value)} />
            </div>
            <div>
              <label className="label">Total units <span className="text-ink-500">(optional)</span></label>
              <input
                className="field"
                type="number"
                placeholder="48"
                value={units}
                onChange={(e) => setUnits(e.target.valueAsNumber || '')}
              />
            </div>
            <div className="md:col-span-2 flex justify-end pt-2">
              <button
                className="btn-primary"
                onClick={() => setStep(2)}
                disabled={!name || !addr1 || !city}
              >
                Review →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Review ── */}
        {step === 2 && (
          <div className="mt-8 space-y-4">
            <div className="card p-6 space-y-4">
              <div>
                <div className="text-xs uppercase tracking-widest text-ink-400">Building name</div>
                <div className="mt-1 font-display text-2xl">{name}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-ink-400">Address</div>
                <div className="mt-1 text-sm text-ink-200">
                  {addr1}{addr2 ? `, ${addr2}` : ''}, {city} {region} {postal}
                </div>
              </div>
              {units && (
                <div>
                  <div className="text-xs uppercase tracking-widest text-ink-400">Total units</div>
                  <div className="mt-1 text-sm text-ink-200">{units}</div>
                </div>
              )}
              {lat && lng && (
                <div>
                  <div className="text-xs uppercase tracking-widest text-ink-400">Location detected</div>
                  <div className="mt-1 text-xs text-gleam">✓ Coordinates captured — radius matching enabled</div>
                </div>
              )}
              {!lat && (
                <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300">
                  Tip: select an address from the autocomplete dropdown to enable precise radius matching with nearby car washes.
                </div>
              )}
            </div>
            {err && <div className="text-sm text-red-400">{err}</div>}
            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="btn-quiet">Back</button>
              <button onClick={finish} disabled={busy} className="btn-primary">
                {busy ? 'Setting up…' : 'Finish setup →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
