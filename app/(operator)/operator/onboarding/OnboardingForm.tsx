'use client';
import { Logo } from '@/components/Logo';
import { AddressAutocomplete, type ParsedAddress } from '@/components/AddressAutocomplete';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect, Fragment } from 'react';

// ─── constants ────────────────────────────────────────────────────────────────

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const STEPS = ['Your profile', 'Portfolio', 'Packages', 'Location & hours'];
const SAVE_KEY = 'gg_operator_onboarding_v1';

const SPECIALTY_GROUPS: { label: string; options: string[] }[] = [
  {
    label: 'Basic services',
    options: [
      'Basic exterior wash', 'Rinse & dry', 'Hand wash', 'Touchless wash',
      'Foam wash', 'Waterless wash', 'Quick detail spray', 'Tire shine',
      'Window cleaning', 'Vacuum', 'Wipe-down interior', 'Air freshener',
    ],
  },
  {
    label: 'Interior detail',
    options: [
      'Full interior detail', 'Deep vacuum', 'Carpet shampoo', 'Seat shampoo',
      'Leather conditioning', 'Dashboard & trim wipe', 'Door panel cleaning',
      'Vent cleaning', 'Trunk detail', 'Pet hair removal', 'Odor removal',
      'Ozone treatment', 'Steam cleaning',
    ],
  },
  {
    label: 'Exterior detail',
    options: [
      'Full exterior detail', 'Clay bar treatment', 'Wax & polish',
      'Paint sealant', 'Ceramic coating', 'Paint correction',
      'Scratch removal', 'Swirl mark removal', 'Oxidation removal',
      'Headlight restoration', 'Trim restoration', 'Chrome polishing',
      'Engine cleaning', 'Wheel & tire detail', 'Undercarriage wash',
    ],
  },
  {
    label: 'Protection & upgrades',
    options: [
      'Paint protection film (PPF)', 'Ceramic tint', 'Window tinting',
      'Graphene coating', 'Rain repellent', 'Rust protection',
      'Fabric protection', 'Anti-graffiti coating',
    ],
  },
  {
    label: 'Specialty vehicles',
    options: [
      'SUV / truck', 'Oversized vehicle', 'Luxury / exotic car',
      'Electric vehicle (EV)', 'Motorcycle', 'Fleet vehicles',
      'Boats', 'RVs & campers',
    ],
  },
];

const ALL_PRESETS = SPECIALTY_GROUPS.flatMap((g) => g.options);

// ─── types ────────────────────────────────────────────────────────────────────

type DayHours = { open: string; close: string; closed: boolean };
type Hours = Record<string, DayHours>;
type PkgDraft = { name: string; description: string; price: string; minutes: string };
type PortfolioDraft = { file: File; preview: string; title: string };

function defaultHours(): Hours {
  return Object.fromEntries(
    DAYS.map((d) => [d, { open: '08:00', close: '17:00', closed: d === 'Sun' }])
  );
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

type SavedState = {
  step: number;
  name: string; tagline: string; description: string; yearsExp: string;
  specialties: string[];
  packages: PkgDraft[];
  addr: string; city: string; region: string; lat: number | null; lng: number | null;
  radius: number; hours: Hours;
};

function loadSaved(): Partial<SavedState> {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(SAVE_KEY) ?? '{}'); } catch { return {}; }
}

function saved<T>(key: keyof SavedState, fallback: T): T {
  const s = loadSaved();
  return (s[key] as T) ?? fallback;
}

// ─── step bar ─────────────────────────────────────────────────────────────────

function StepBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="mb-8">
      <div className="flex items-center">
        {STEPS.map((label, i) => (
          <Fragment key={label}>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                i < step
                  ? 'bg-gleam text-black'
                  : i === step
                  ? 'bg-gleam/20 border border-gleam text-gleam'
                  : 'bg-ink-800 border border-ink-700 text-ink-500'
              }`}
            >
              {i < step ? '✓' : i + 1}
            </div>
            {i < total - 1 && (
              <div className={`flex-1 h-0.5 transition-all ${i < step ? 'bg-gleam' : 'bg-ink-700'}`} />
            )}
          </Fragment>
        ))}
      </div>
      <div className="text-xs text-ink-400 mt-2">
        Step {step + 1} of {total} · <span className="text-ink-200">{STEPS[step]}</span>
      </div>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export function OnboardingForm() {
  const router = useRouter();
  // Clamp step in case localStorage has a value from an older version of the form
  const [step, setStep] = useState(() => Math.min(saved('step', 0) as number, STEPS.length - 1));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Step 1 – profile (restored from localStorage where possible)
  const [name, setName] = useState(() => saved('name', '') as string);
  const [tagline, setTagline] = useState(() => saved('tagline', '') as string);
  const [description, setDescription] = useState(() => saved('description', '') as string);
  const [yearsExp, setYearsExp] = useState(() => saved('yearsExp', '') as string);
  const [specialties, setSpecialties] = useState<string[]>(() => saved('specialties', []) as string[]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  // Step 2 – portfolio (files can't be stored in localStorage)
  const [portfolio, setPortfolio] = useState<PortfolioDraft[]>([]);
  const portfolioInputRef = useRef<HTMLInputElement>(null);

  // Step 3 – packages
  const [packages, setPackages] = useState<PkgDraft[]>(
    () => saved('packages', [{ name: '', description: '', price: '', minutes: '' }]) as PkgDraft[]
  );

  // Step 4 – location & hours
  const [addr, setAddr] = useState(() => saved('addr', '') as string);
  const [city, setCity] = useState(() => saved('city', '') as string);
  const [region, setRegion] = useState(() => saved('region', '') as string);
  const [lat, setLat] = useState<number | null>(() => saved('lat', null) as number | null);
  const [lng, setLng] = useState<number | null>(() => saved('lng', null) as number | null);
  const [radius, setRadius] = useState(() => saved('radius', 15) as number);
  const [hours, setHours] = useState<Hours>(() => saved('hours', defaultHours()) as Hours);

  // ── auto-save to localStorage on every change ─────────────────────────────

  useEffect(() => {
    const state: SavedState = {
      step, name, tagline, description, yearsExp, specialties,
      packages, addr, city, region, lat, lng, radius, hours,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  }, [step, name, tagline, description, yearsExp, specialties, packages, addr, city, region, lat, lng, radius, hours]);

  // ── helpers ───────────────────────────────────────────────────────────────

  function toggleSpecialty(s: string) {
    setSpecialties((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }

  function addCustomTag() {
    const tag = customTagInput.trim();
    if (!tag || specialties.includes(tag)) { setCustomTagInput(''); return; }
    setSpecialties((prev) => [...prev, tag]);
    setCustomTagInput('');
  }

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setCoverFile(f);
    setCoverPreview(URL.createObjectURL(f));
  }

  function addPortfolioFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setPortfolio((p) => [
      ...p,
      ...files.map((f) => ({ file: f, preview: URL.createObjectURL(f), title: '' })),
    ]);
    e.target.value = '';
  }

  function updateDay(day: string, patch: Partial<DayHours>) {
    setHours((h) => ({ ...h, [day]: { ...h[day], ...patch } }));
  }

  function addPackageRow() {
    setPackages((p) => [...p, { name: '', description: '', price: '', minutes: '' }]);
  }

  function removePackageRow(i: number) {
    setPackages((p) => p.filter((_, idx) => idx !== i));
  }

  function updatePackage(i: number, patch: Partial<PkgDraft>) {
    setPackages((p) => p.map((pkg, idx) => (idx === i ? { ...pkg, ...patch } : pkg)));
  }

  // ── validation ────────────────────────────────────────────────────────────

  function canAdvance(): boolean {
    if (step === 0) return name.trim().length > 0 && description.trim().length > 0;
    if (step === 1) return true;
    if (step === 2) return packages.some((p) => p.name && p.price);
    if (step === 3) return addr.trim().length > 0; // lat preferred but not a hard gate
    return true;
  }

  // ── submit ────────────────────────────────────────────────────────────────

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
    const sb = supabaseBrowser();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setErr('Not signed in'); setBusy(false); return; }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const validPkgs = packages.filter((p) => p.name && p.price);
    const basePrice = validPkgs.length ? Math.round(parseFloat(validPkgs[0].price) * 100) : 3500;

    // Core insert — always-present columns
    const { data: op, error: opErr } = await sb.from('operators').insert({
      owner_id: user.id,
      name,
      slug,
      description,
      lat: lat ?? null,
      lng: lng ?? null,
      service_radius_miles: radius,
      base_price_cents: basePrice,
      open_slot_price_cents: Math.round(basePrice * 1.3),
      capacity_per_day: 20,
      hours_json: hours,
      status: 'pending_review',
    }).select('id').single();

    if (opErr || !op) { setErr(opErr?.message ?? 'Failed to create profile'); setBusy(false); return; }

    // Extended fields (new columns from migration 0017) — fire-and-forget
    // If the migration hasn't been applied yet these will silently fail without blocking
    let coverPhotoUrl: string | null = null;
    if (coverFile) {
      const path = `${user.id}/cover-${Date.now()}-${coverFile.name}`;
      const { error: upErr } = await sb.storage.from('operator-portfolio').upload(path, coverFile, { upsert: true });
      if (!upErr) coverPhotoUrl = sb.storage.from('operator-portfolio').getPublicUrl(path).data.publicUrl;
    }
    await sb.from('operators').update({
      tagline: tagline || null,
      years_experience: yearsExp ? parseInt(yearsExp, 10) : null,
      specialties,
      cover_photo_url: coverPhotoUrl,
    }).eq('id', op.id);

    // Portfolio items
    for (let i = 0; i < portfolio.length; i++) {
      const item = portfolio[i];
      const isVideo = item.file.type.startsWith('video/');
      const path = `${op.id}/portfolio-${Date.now()}-${i}-${item.file.name}`;
      const { error: upErr } = await sb.storage.from('operator-portfolio').upload(path, item.file);
      if (upErr) continue;
      const url = sb.storage.from('operator-portfolio').getPublicUrl(path).data.publicUrl;
      await sb.from('operator_portfolio_items').insert({
        operator_id: op.id,
        url,
        media_type: isVideo ? 'video' : 'photo',
        title: item.title || null,
        display_order: i,
      });
    }

    // Packages
    if (validPkgs.length) {
      await sb.from('service_packages').insert(
        validPkgs.map((p, i) => ({
          operator_id: op.id,
          name: p.name,
          description: p.description || null,
          price_cents: Math.round(parseFloat(p.price) * 100),
          est_minutes: p.minutes ? parseInt(p.minutes, 10) : null,
          active: true,
          display_order: i,
        }))
      );
    }

    localStorage.removeItem(SAVE_KEY);
    router.push('/operator');
    } catch (e: any) {
      setErr(e?.message ?? 'Something went wrong — please try again');
      setBusy(false);
    }
  }

  // ── render ────────────────────────────────────────────────────────────────

  const customTags = specialties.filter((s) => !ALL_PRESETS.includes(s));

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Logo />
      <div className="mt-10">
        <div className="text-xs uppercase tracking-[0.18em] text-gleam">Apply to Lavo</div>
        <h1 className="mt-2 font-display text-4xl tracking-tight">Set up your operator profile</h1>
        <p className="mt-2 text-sm text-ink-400">
          Your profile is what buildings and residents see when choosing a car wash operator. Make it shine.
        </p>

        <div className="mt-8">
          <StepBar step={step} total={STEPS.length} />

          {/* ── Step 1: Your profile ───────────────────────────────────── */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <label className="label">Cover / profile photo</label>
                <div
                  className="relative mt-1 h-40 rounded-xl border-2 border-dashed border-ink-600 overflow-hidden cursor-pointer hover:border-gleam/60 transition-colors"
                  onClick={() => document.getElementById('cover-upload')?.click()}
                >
                  {coverPreview ? (
                    <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-ink-500">
                      <span className="text-3xl">📸</span>
                      <span className="text-sm">Upload a cover photo of your team or work</span>
                    </div>
                  )}
                </div>
                <input id="cover-upload" type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
              </div>

              <div>
                <label className="label">Business name <span className="text-red-400">*</span></label>
                <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Merlo Auto Detailing" />
              </div>

              <div>
                <label className="label">Tagline</label>
                <input
                  className="field"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="e.g. Premium mobile detailing with a 5-star reputation"
                  maxLength={120}
                />
                <p className="mt-1 text-xs text-ink-500">Short headline shown under your name. ({tagline.length}/120)</p>
              </div>

              <div>
                <label className="label">About your business <span className="text-red-400">*</span></label>
                <textarea
                  className="field min-h-[120px]"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell residents and building managers about your experience, team size, equipment, and what sets you apart. Operators with detailed bios get 3× more partnerships."
                />
              </div>

              <div>
                <label className="label">Years in business</label>
                <input className="field w-32" type="number" min={0} max={50} value={yearsExp} onChange={(e) => setYearsExp(e.target.value)} placeholder="e.g. 5" />
              </div>

              <div>
                <label className="label">Specialties & services</label>
                <p className="text-xs text-ink-500 mb-3">Select everything you offer — residents filter by these. Add your own at the bottom.</p>
                <div className="space-y-4">
                  {SPECIALTY_GROUPS.map((group) => (
                    <div key={group.label}>
                      <div className="text-xs font-semibold uppercase tracking-wider text-ink-500 mb-2">{group.label}</div>
                      <div className="flex flex-wrap gap-2">
                        {group.options.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => toggleSpecialty(s)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                              specialties.includes(s)
                                ? 'bg-gleam/20 border-gleam text-gleam'
                                : 'bg-ink-800 border-ink-600 text-ink-400 hover:border-ink-400'
                            }`}
                          >
                            {specialties.includes(s) && '✓ '}{s}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-ink-500 mb-2">Add your own</div>
                    {customTags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {customTags.map((s) => (
                          <span key={s} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border bg-gleam/20 border-gleam text-gleam">
                            {s}
                            <button type="button" onClick={() => toggleSpecialty(s)} className="ml-0.5 text-gleam/60 hover:text-red-400 leading-none">×</button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        className="field text-sm flex-1"
                        placeholder="e.g. Boat detailing, Fleet contracts, Same-day service…"
                        value={customTagInput}
                        onChange={(e) => setCustomTagInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag(); } }}
                      />
                      <button type="button" onClick={addCustomTag} disabled={!customTagInput.trim()} className="btn-quiet text-sm px-4 shrink-0">Add</button>
                    </div>
                    <p className="mt-1 text-xs text-ink-600">Press Enter or click Add.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Portfolio ──────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="card border-gleam/20 bg-gleam/5 p-4 text-sm text-ink-300">
                <strong className="text-gleam">Show your best work.</strong> Operators with 4+ portfolio photos
                get significantly more building partnerships. Upload before/after shots, team photos, or finished cars.
              </div>
              <div
                className="h-28 rounded-xl border-2 border-dashed border-ink-600 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-gleam/60 transition-colors"
                onClick={() => portfolioInputRef.current?.click()}
              >
                <span className="text-2xl">🖼️</span>
                <span className="text-sm text-ink-400">Click to add photos or videos</span>
                <span className="text-xs text-ink-600">JPG, PNG, MP4, MOV · max 50 MB each</span>
              </div>
              <input ref={portfolioInputRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={addPortfolioFiles} />
              {portfolio.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  {portfolio.map((item, i) => (
                    <div key={i} className="card p-3 space-y-2">
                      <div className="relative h-36 rounded-lg overflow-hidden bg-ink-800">
                        {item.file.type.startsWith('video/') ? (
                          <video src={item.preview} className="w-full h-full object-cover" muted />
                        ) : (
                          <img src={item.preview} alt="" className="w-full h-full object-cover" />
                        )}
                        <button
                          type="button"
                          onClick={() => setPortfolio((p) => p.filter((_, idx) => idx !== i))}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 text-white text-xs flex items-center justify-center hover:bg-red-600"
                        >✕</button>
                        {item.file.type.startsWith('video/') && (
                          <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded text-xs bg-black/70 text-white">▶ Video</div>
                        )}
                      </div>
                      <input
                        className="field text-sm"
                        placeholder="Caption (e.g. Before & after full detail)"
                        value={item.title}
                        onChange={(e) => setPortfolio((p) => p.map((x, idx) => idx === i ? { ...x, title: e.target.value } : x))}
                      />
                    </div>
                  ))}
                </div>
              )}
              {portfolio.length === 0 && (
                <p className="text-center text-sm text-ink-500 py-4">No photos yet. You can add these later from your profile.</p>
              )}
            </div>
          )}

          {/* ── Step 3: Packages ──────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="card border-gleam/20 bg-gleam/5 p-4 text-sm text-ink-300">
                <strong className="text-gleam">Create your service packages.</strong> Think Fiverr tiers —
                Basic, Standard, Premium — or specific names like "Full Detail" or "Exterior Only". Residents choose from these when booking.
              </div>
              {packages.map((pkg, i) => (
                <div key={i} className="card p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-ink-300">Package {i + 1}</span>
                    {packages.length > 1 && (
                      <button type="button" onClick={() => removePackageRow(i)} className="text-xs text-ink-500 hover:text-red-400">Remove</button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="label">Package name</label>
                      <input className="field" placeholder="e.g. Basic Exterior Wash" value={pkg.name} onChange={(e) => updatePackage(i, { name: e.target.value })} />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="label">Price (USD)</label>
                      <input className="field" type="number" step="0.01" min="5" placeholder="e.g. 35" value={pkg.price} onChange={(e) => updatePackage(i, { price: e.target.value })} />
                    </div>
                    <div className="col-span-2">
                      <label className="label">What's included</label>
                      <textarea className="field min-h-[80px] text-sm" placeholder="e.g. Hand wash exterior, wheel scrub, tire shine, windows, air freshener" value={pkg.description} onChange={(e) => updatePackage(i, { description: e.target.value })} />
                    </div>
                    <div>
                      <label className="label">Est. time (min)</label>
                      <input className="field" type="number" min="5" placeholder="e.g. 45" value={pkg.minutes} onChange={(e) => updatePackage(i, { minutes: e.target.value })} />
                    </div>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addPackageRow}
                className="w-full py-3 rounded-xl border-2 border-dashed border-ink-600 text-sm text-ink-400 hover:border-gleam/50 hover:text-gleam transition-colors"
              >
                + Add another package
              </button>
              {!packages.some((p) => p.name && p.price) && (
                <p className="text-xs text-amber-400">Add at least one package with a name and price to continue.</p>
              )}
            </div>
          )}

          {/* ── Step 4: Location & hours ───────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="card p-5 space-y-4">
                <h3 className="font-display text-lg">Your business location</h3>
                <div>
                  <label className="label">Business address <span className="text-red-400">*</span></label>
                  <AddressAutocomplete
                    mode="address"
                    value={addr}
                    onChange={setAddr}
                    onSelect={(a: ParsedAddress) => {
                      if (a.street) setAddr(a.street);
                      if (a.city) setCity(a.city);
                      if (a.state) setRegion(a.state);
                      if (a.lat !== null) setLat(a.lat);
                      if (a.lng !== null) setLng(a.lng);
                    }}
                    placeholder="123 Commerce Ave"
                  />
                  {city && <p className="mt-1 text-xs text-ink-400">{city}, {region}</p>}
                  {lat
                    ? <p className="mt-0.5 text-xs text-gleam">✓ Location captured</p>
                    : addr.length > 2 && <p className="mt-0.5 text-xs text-yellow-400">Pick from the dropdown so we can capture your exact location</p>
                  }
                </div>
                <div>
                  <label className="label">How far will you travel? <strong className="text-white">{radius} miles</strong></label>
                  <input type="range" min={3} max={30} value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="w-full accent-gleam" />
                  <div className="flex justify-between text-xs text-ink-500 mt-1"><span>3 mi</span><span>30 mi</span></div>
                  <p className="mt-1 text-xs text-ink-500">Buildings outside this radius won't see your profile.</p>
                </div>
              </div>

              <div className="card p-5">
                <h3 className="font-display text-lg mb-4">Operating hours</h3>
                <div className="space-y-2">
                  {DAYS.map((day) => (
                    <div key={day} className="flex items-center gap-3">
                      <div className="w-8 text-sm text-ink-300">{day}</div>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={!hours[day].closed} onChange={(e) => updateDay(day, { closed: !e.target.checked })} className="accent-gleam" />
                        Open
                      </label>
                      {!hours[day].closed && (
                        <>
                          <input type="time" className="field w-28 py-1 text-sm" value={hours[day].open} onChange={(e) => updateDay(day, { open: e.target.value })} />
                          <span className="text-ink-400 text-sm">–</span>
                          <input type="time" className="field w-28 py-1 text-sm" value={hours[day].close} onChange={(e) => updateDay(day, { close: e.target.value })} />
                        </>
                      )}
                      {hours[day].closed && <span className="text-xs text-ink-500">Closed</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Final review summary */}
              <div className="card border-gleam/20 bg-gleam/5 p-5 space-y-2 text-sm">
                <h3 className="font-medium text-white">Ready to finish?</h3>
                <div className="space-y-1 text-ink-300">
                  <div>✓ <strong className="text-ink-100">{name}</strong>{tagline && ` · "${tagline}"`}</div>
                  {specialties.length > 0 && <div>✓ {specialties.length} specialties selected</div>}
                  <div>✓ {portfolio.length} portfolio {portfolio.length === 1 ? 'item' : 'items'}</div>
                  <div>✓ {packages.filter((p) => p.name && p.price).length} service {packages.filter((p) => p.name && p.price).length === 1 ? 'package' : 'packages'}</div>
                  {city && region && <div>✓ {city}, {region} · {radius} mi radius</div>}
                </div>
                <p className="text-xs text-ink-500 pt-1">We review every application within 48 hours. You'll connect your bank account after approval.</p>
              </div>
            </div>
          )}

          {err && <div className="mt-4 text-sm text-red-400">{err}</div>}

          {/* Navigation */}
          <div className="mt-8 flex gap-3">
            {step > 0 && (
              <button type="button" onClick={() => setStep((s) => s - 1)} className="btn-quiet flex-1" disabled={busy}>
                ← Back
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button type="button" onClick={() => setStep((s) => s + 1)} disabled={!canAdvance()} className="btn-primary flex-1">
                Continue →
              </button>
            ) : (
              <button type="button" onClick={submit} disabled={busy || !canAdvance()} className="btn-primary flex-1">
                {busy ? 'Finishing…' : 'Finish profile →'}
              </button>
            )}
          </div>

          {step > 0 && (
            <p className="mt-3 text-center text-xs text-ink-600">Progress auto-saved — safe to refresh</p>
          )}
        </div>
      </div>
    </main>
  );
}
