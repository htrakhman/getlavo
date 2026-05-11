'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function BuildingSettingsForm({ building }: { building: any }) {
  const router = useRouter();
  const [name, setName] = useState(building.name ?? '');
  const [address, setAddress] = useState(building.address_line1 ?? '');
  const [city, setCity] = useState(building.city ?? '');
  const [region, setRegion] = useState(building.region ?? '');
  const [postal, setPostal] = useState(building.postal_code ?? '');
  const [units, setUnits] = useState(building.total_units != null ? String(building.total_units) : '');
  const [washDay, setWashDay] = useState(building.wash_day ?? '');
  const [welcome, setWelcome] = useState(building.welcome_message ?? '');
  const [logoUrl, setLogoUrl] = useState(building.logo_url ?? '');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [brandColor, setBrandColor] = useState(building.brand_color ?? '#00e5c8');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setErr(null);
    const sb = supabaseBrowser();
    let nextLogoUrl = logoUrl;
    if (logoFile) {
      const path = `${building.id}/${Date.now()}-${logoFile.name}`;
      const { error: ue } = await sb.storage.from('qr-codes').upload(path, logoFile, { upsert: true });
      if (!ue) {
        const { data } = sb.storage.from('qr-codes').getPublicUrl(path);
        nextLogoUrl = data.publicUrl;
      }
    }
    const { error } = await sb.from('buildings').update({
      name,
      address_line1: address,
      city,
      region,
      postal_code: postal,
      total_units: units ? parseInt(units, 10) : null,
      wash_day: washDay || null,
      welcome_message: welcome || null,
      logo_url: nextLogoUrl || null,
      brand_color: brandColor || null,
    }).eq('id', building.id);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  return (
    <div className="card max-w-2xl p-6">
      <h3 className="font-display text-lg mb-4">Property details</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="label">Building name</label>
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="label">Address</label>
          <input className="field" value={address} onChange={(e) => setAddress(e.target.value)} />
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
          <label className="label">Postal code</label>
          <input className="field" value={postal} onChange={(e) => setPostal(e.target.value)} />
        </div>
        <div>
          <label className="label">Total units</label>
          <input className="field" type="number" value={units} onChange={(e) => setUnits(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="label">Wash day</label>
          <div className="mt-1 flex flex-wrap gap-2">
            {DAYS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setWashDay(washDay === d ? '' : d)}
                className={`chip ${washDay === d ? 'border-gleam text-gleam' : ''}`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-8 border-t border-white/5 pt-6">
        <h3 className="font-display text-lg mb-3">Branding (resident-facing)</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="label">Welcome message on /b/{building.slug}</label>
            <textarea className="field min-h-20" value={welcome} onChange={(e) => setWelcome(e.target.value)} placeholder="A short note residents see when they land on your signup page." />
          </div>
          <div>
            <label className="label">Logo</label>
            <input type="file" accept="image/*" className="field !p-2 text-sm" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} />
            {logoUrl && <img src={logoUrl} alt="" className="mt-2 h-10" />}
          </div>
          <div>
            <label className="label">Accent color</label>
            <input type="color" value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="h-10 w-20 rounded border border-white/10 bg-transparent" />
          </div>
        </div>
      </div>

      {err && <div className="mt-3 text-sm text-red-400">{err}</div>}
      <div className="mt-5 flex items-center gap-3">
        <button onClick={save} disabled={busy} className="btn-primary">
          {busy ? 'Saving…' : saved ? 'Saved' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}
