'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

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

const ALL_PRESET_OPTIONS = SPECIALTY_GROUPS.flatMap((g) => g.options);

export function OperatorProfileEditor({ op }: { op: any }) {
  const router = useRouter();
  const [name, setName] = useState(op.name);
  const [tagline, setTagline] = useState(op.tagline ?? '');
  const [description, setDescription] = useState(op.description ?? '');
  const [yearsExp, setYearsExp] = useState(op.years_experience ? String(op.years_experience) : '');
  const [specialties, setSpecialties] = useState<string[]>(op.specialties ?? []);
  // 56 preset options rendered at once is a wall of chips to scroll past on the
  // way to the rest of the profile. Each group collapses to a single row with a
  // count, and groups the operator already uses open on load so existing
  // selections stay visible without hunting for them.
  const [openGroups, setOpenGroups] = useState<string[]>(() =>
    SPECIALTY_GROUPS.filter((g) => g.options.some((o) => (op.specialties ?? []).includes(o))).map(
      (g) => g.label,
    ),
  );

  function toggleGroup(label: string) {
    setOpenGroups((prev) => (prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]));
  }
  const [customTagInput, setCustomTagInput] = useState('');
  const [radius, setRadius] = useState(op.service_radius_miles ?? 15);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(op.cover_photo_url ?? null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  function toggleSpecialty(s: string) {
    setSpecialties((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
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

  async function save() {
    setBusy(true);
    const sb = supabaseBrowser();

    let coverPhotoUrl = op.cover_photo_url;
    if (coverFile) {
      const path = `${op.id}/cover-${Date.now()}-${coverFile.name}`;
      const { error: upErr } = await sb.storage.from('operator-portfolio').upload(path, coverFile, { upsert: true });
      if (!upErr) {
        coverPhotoUrl = sb.storage.from('operator-portfolio').getPublicUrl(path).data.publicUrl;
      }
    }

    await sb.from('operators').update({
      name,
      tagline: tagline || null,
      description,
      years_experience: yearsExp ? parseInt(yearsExp, 10) : null,
      specialties,
      cover_photo_url: coverPhotoUrl,
      service_radius_miles: Number(radius),
    }).eq('id', op.id);

    setBusy(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  return (
    <div className="card p-6">
      <h3 className="font-display text-xl mb-5">Business details</h3>

      {/* Cover photo */}
      <div className="mb-5">
        <label className="label">Cover / profile photo</label>
        <div
          className="relative mt-1 h-44 rounded-xl border-2 border-dashed border-ink-600 overflow-hidden cursor-pointer hover:border-gleam/60 transition-colors"
          onClick={() => document.getElementById('profile-cover-upload')?.click()}
        >
          {coverPreview ? (
            <>
              <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center">
                <span className="opacity-0 hover:opacity-100 text-[#fff] text-sm font-medium">Change photo</span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-ink-500">
              <span className="text-sm">Upload a cover photo of your team or work</span>
            </div>
          )}
        </div>
        <input id="profile-cover-upload" type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="label">Business name</label>
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="md:col-span-2">
          <label className="label">Tagline</label>
          <input
            className="field"
            placeholder="e.g. Premium mobile detailing with a 5-star reputation"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            maxLength={120}
          />
          <p className="mt-1 text-xs text-ink-500">Short headline shown under your name on your profile. ({tagline.length}/120)</p>
        </div>

        <div className="md:col-span-2">
          <label className="label">About your business</label>
          <textarea
            className="field min-h-[100px]"
            placeholder="Tell residents and building managers about your experience, team, equipment, and what sets you apart."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <label className="label">Years in business</label>
          <input
            className="field"
            type="number"
            min={0}
            max={50}
            placeholder="e.g. 5"
            value={yearsExp}
            onChange={(e) => setYearsExp(e.target.value)}
          />
        </div>

        <div>
          <label className="label">Service radius (mi)</label>
          <input
            className="field"
            type="number"
            value={radius}
            onChange={(e) => setRadius(parseInt(e.target.value || '0', 10))}
          />
        </div>
      </div>

      <div className="mt-5">
        <label className="label">Specialties & services</label>
        <p className="text-xs text-ink-500 mb-3">Select everything you offer — residents filter by these. Add your own at the bottom.</p>
        <div className="space-y-4">
          {SPECIALTY_GROUPS.map((group) => {
            const open = openGroups.includes(group.label);
            const chosen = group.options.filter((o) => specialties.includes(o)).length;
            return (
              <div key={group.label}>
                <button
                  type="button"
                  onClick={() => toggleGroup(group.label)}
                  aria-expanded={open}
                  className="flex w-full items-center gap-2 text-left text-xs font-semibold uppercase tracking-wider text-ink-500 hover:text-ink-300 transition-colors"
                >
                  <span className={`transition-transform ${open ? 'rotate-90' : ''}`}>›</span>
                  <span>{group.label}</span>
                  {chosen > 0 && (
                    <span className="rounded-full bg-gleam/20 px-2 py-0.5 text-[10px] text-gleam normal-case tracking-normal">
                      {chosen}
                    </span>
                  )}
                  <span className="ml-auto text-[10px] font-normal normal-case tracking-normal text-ink-600">
                    {open ? 'Hide' : `${group.options.length} options`}
                  </span>
                </button>
                {open && (
                  <div className="flex flex-wrap gap-2 mt-2">
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
                )}
              </div>
            );
          })}

          {/* Custom tags */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-ink-500 mb-2">Add your own</div>
            {specialties.filter((s) => !ALL_PRESET_OPTIONS.includes(s)).length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {specialties
                  .filter((s) => !ALL_PRESET_OPTIONS.includes(s))
                  .map((s) => (
                    <span
                      key={s}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border bg-gleam/20 border-gleam text-gleam"
                    >
                      {s}
                      <button
                        type="button"
                        onClick={() => toggleSpecialty(s)}
                        className="ml-0.5 text-gleam/60 hover:text-red-400 leading-none"
                      >
                        ×
                      </button>
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
              <button
                type="button"
                onClick={addCustomTag}
                disabled={!customTagInput.trim()}
                className="btn-quiet text-sm px-4 shrink-0"
              >
                Add
              </button>
            </div>
            <p className="mt-1 text-xs text-ink-600">Press Enter or click Add.</p>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <button onClick={save} disabled={busy} className="btn-primary text-sm">
          {busy ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}
