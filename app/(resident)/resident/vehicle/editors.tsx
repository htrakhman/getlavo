'use client';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const COLORS = ['White', 'Black', 'Silver', 'Gray', 'Red', 'Blue', 'Green', 'Other'];

export function SpotEditor({ residentId, unit, floor, spotLabel }: { residentId: string; unit: string; floor: number | null; spotLabel: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [u, setU] = useState(unit);
  const [f, setF] = useState(floor != null ? String(floor) : '');
  const [s, setS] = useState(spotLabel);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const sb = supabaseBrowser();
    await sb.from('residents').update({
      unit_number: u,
      floor_number: f ? parseInt(f, 10) : null,
      spot_label: s,
    }).eq('id', residentId);
    setBusy(false);
    setEditing(false);
    router.refresh();
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xl">Spot</h3>
        {!editing && <button onClick={() => setEditing(true)} className="text-xs text-gleam">Edit</button>}
      </div>
      {!editing ? (
        <>
          <div className="mt-3 font-display text-2xl">{spotLabel || '—.—'}</div>
          <div className="mt-1 text-sm text-ink-400">
            Unit {unit || '—'}{floor != null ? ` · Floor ${floor}` : ''}
          </div>
        </>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Unit</label>
              <input className="field" value={u} onChange={(e) => setU(e.target.value)} />
            </div>
            <div>
              <label className="label">Floor</label>
              <input className="field" type="number" value={f} onChange={(e) => setF(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Parking spot</label>
            <input className="field" value={s} onChange={(e) => setS(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={busy} className="btn-primary text-sm">{busy ? 'Saving…' : 'Save'}</button>
            <button onClick={() => setEditing(false)} className="btn-quiet text-sm">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function VehiclesList({ residentId, vehicles }: { residentId: string; vehicles: any[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(vehicles.length === 0);
  const [editing, setEditing] = useState<string | null>(null);

  async function setPrimary(id: string) {
    const sb = supabaseBrowser();
    await sb.from('vehicles').update({ is_primary: false }).eq('resident_id', residentId);
    await sb.from('vehicles').update({ is_primary: true }).eq('id', id);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm('Remove this vehicle? Past washes for it stay on record.')) return;
    const sb = supabaseBrowser();
    await sb.from('vehicles').delete().eq('id', id);
    router.refresh();
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-xl">Vehicles</h3>
        {!adding && (
          <button onClick={() => setAdding(true)} className="btn-quiet text-xs">+ Add vehicle</button>
        )}
      </div>

      {vehicles.length === 0 && !adding && (
        <p className="text-sm text-ink-400">No vehicle on file.</p>
      )}

      <div className="space-y-3">
        {vehicles.map((v) => (
          <div key={v.id} className="rounded-lg border border-white/5 p-4">
            {editing === v.id ? (
              <VehicleForm
                residentId={residentId}
                vehicle={v}
                onDone={() => { setEditing(null); router.refresh(); }}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="font-display text-lg">{v.year} {v.make} {v.model}</div>
                    {v.is_primary && <span className="chip text-gleam !py-0.5 !px-2 text-[10px]">primary</span>}
                  </div>
                  <div className="mt-1 text-xs text-ink-400">{v.color} · <span className="font-mono">{v.license_plate}</span></div>
                </div>
                <div className="flex flex-col gap-1 text-right">
                  <button onClick={() => setEditing(v.id)} className="text-xs text-gleam">Edit</button>
                  {!v.is_primary && (
                    <button onClick={() => setPrimary(v.id)} className="text-xs text-ink-300 hover:text-ink-100">Make primary</button>
                  )}
                  {vehicles.length > 1 && (
                    <button onClick={() => remove(v.id)} className="text-xs text-ink-400 hover:text-red-400">Remove</button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {adding && (
          <div className="rounded-lg border border-gleam/30 p-4">
            <VehicleForm
              residentId={residentId}
              vehicle={null}
              isFirst={vehicles.length === 0}
              onDone={() => { setAdding(false); router.refresh(); }}
              onCancel={() => setAdding(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function VehicleForm({ residentId, vehicle, onDone, onCancel, isFirst }: {
  residentId: string;
  vehicle: any | null;
  onDone: () => void;
  onCancel: () => void;
  isFirst?: boolean;
}) {
  const [make, setMake] = useState(vehicle?.make ?? '');
  const [model, setModel] = useState(vehicle?.model ?? '');
  const [year, setYear] = useState(vehicle?.year ? String(vehicle.year) : '');
  const [color, setColor] = useState(vehicle?.color ?? 'White');
  const [plate, setPlate] = useState(vehicle?.license_plate ?? '');
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const sb = supabaseBrowser();
    const payload: any = {
      resident_id: residentId,
      make,
      model,
      year: year ? parseInt(year, 10) : null,
      color,
      license_plate: plate || 'UNKNOWN',
    };
    if (vehicle?.id) {
      await sb.from('vehicles').update(payload).eq('id', vehicle.id);
    } else {
      payload.is_primary = !!isFirst;
      await sb.from('vehicles').insert(payload);
    }
    setBusy(false);
    onDone();
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="label">Make</label>
        <input className="field" value={make} onChange={(e) => setMake(e.target.value)} />
      </div>
      <div>
        <label className="label">Model</label>
        <input className="field" value={model} onChange={(e) => setModel(e.target.value)} />
      </div>
      <div>
        <label className="label">Year</label>
        <input className="field" type="number" value={year} onChange={(e) => setYear(e.target.value)} />
      </div>
      <div>
        <label className="label">License plate</label>
        <input className="field font-mono uppercase" value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} />
      </div>
      <div className="col-span-2">
        <label className="label">Color</label>
        <div className="mt-1 flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button type="button" key={c} onClick={() => setColor(c)} className={`chip ${color === c ? 'border-gleam text-gleam' : ''}`}>{c}</button>
          ))}
        </div>
      </div>
      <div className="col-span-2 flex gap-2">
        <button onClick={save} disabled={busy || !make || !model} className="btn-primary text-sm">{busy ? 'Saving…' : 'Save'}</button>
        <button onClick={onCancel} className="btn-quiet text-sm">Cancel</button>
      </div>
    </div>
  );
}

// Backwards-compat alias used by existing imports.
export const VehicleEditor = ({ residentId, vehicle }: { residentId: string; vehicle: any }) => (
  <VehiclesList residentId={residentId} vehicles={vehicle ? [vehicle] : []} />
);
