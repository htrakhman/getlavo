'use client';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

type Floor = { label: string; spotCount: number; notes?: string };

export function GarageLayoutEditor({ buildingId, initial }: { buildingId: string; initial: Floor[] }) {
  const [floors, setFloors] = useState<Floor[]>(initial.length ? initial : [{ label: 'Level 1', spotCount: 20, notes: '' }]);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  function update(i: number, patch: Partial<Floor>) {
    setFloors((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  }
  function add() {
    if (floors.length >= 10) return;
    setFloors((prev) => [...prev, { label: `Level ${prev.length + 1}`, spotCount: 20, notes: '' }]);
  }
  function remove(i: number) {
    setFloors((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function save() {
    setBusy(true);
    const sb = supabaseBrowser();
    await sb.from('buildings').update({ garage_levels_json: floors }).eq('id', buildingId);
    setBusy(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {floors.map((f, i) => (
          <div key={i} className="card grid grid-cols-12 gap-3 p-4">
            <div className="col-span-4">
              <label className="label">Floor label</label>
              <input className="field" value={f.label} onChange={(e) => update(i, { label: e.target.value })} />
            </div>
            <div className="col-span-3">
              <label className="label">Spots</label>
              <input className="field" type="number" value={f.spotCount} onChange={(e) => update(i, { spotCount: parseInt(e.target.value || '0', 10) })} />
            </div>
            <div className="col-span-4">
              <label className="label">Notes</label>
              <input className="field" placeholder="Compact spots, low clearance…" value={f.notes ?? ''} onChange={(e) => update(i, { notes: e.target.value })} />
            </div>
            <div className="col-span-1 flex items-end">
              <button onClick={() => remove(i)} className="btn-quiet text-xs">Remove</button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button onClick={add} disabled={floors.length >= 10} className="btn-quiet">+ Add floor</button>
        <button onClick={save} disabled={busy} className="btn-primary">
          {busy ? 'Saving…' : saved ? 'Saved' : 'Save layout'}
        </button>
      </div>

      <div className="card p-5">
        <div className="text-xs uppercase tracking-widest text-ink-400 mb-3">Preview</div>
        <div className="space-y-1.5">
          {floors.map((f, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg bg-ink-800/60 px-3 py-2 text-sm">
              <div>
                <span className="font-medium">{f.label}</span>
                {f.notes && <span className="ml-2 text-xs text-ink-400">· {f.notes}</span>}
              </div>
              <span className="text-xs text-ink-300">{f.spotCount} spots</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
