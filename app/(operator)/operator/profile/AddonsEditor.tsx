'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

const TYPES: { value: string; label: string }[] = [
  { value: 'interior_detail', label: 'Interior Detail' },
  { value: 'wax', label: 'Wax' },
  { value: 'tire_shine', label: 'Tire Shine' },
  { value: 'pet_hair', label: 'Pet Hair Removal' },
];

export function AddonsEditor({ operatorId, initial }: { operatorId: string; initial: any[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  async function remove(id: string) {
    const sb = supabaseBrowser();
    await sb.from('operator_addons').update({ active: false }).eq('id', id);
    setItems((p) => p.filter((x) => x.id !== id));
    router.refresh();
  }

  return (
    <div className="card p-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-xl">Add-ons</h3>
        <button onClick={() => setAdding(true)} className="btn-quiet text-sm">+ Add add-on</button>
      </div>

      <div className="space-y-2">
        {items.filter((a) => a.active).map((a) => (
          <div key={a.id} className="card p-3">
            {editing === a.id ? (
              <AddonForm
                operatorId={operatorId}
                addon={a}
                onDone={(u) => {
                  setEditing(null);
                  setItems((prev) => prev.map((x) => (x.id === u.id ? u : x)));
                  router.refresh();
                }}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm">{a.label}</div>
                  <div className="text-xs text-ink-500">{TYPES.find((t) => t.value === a.type)?.label ?? a.type}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gleam text-sm">${(a.price_cents / 100).toFixed(2)}</span>
                  <button onClick={() => setEditing(a.id)} className="text-xs text-gleam">✎</button>
                  <button onClick={() => remove(a.id)} className="text-xs text-ink-400 hover:text-red-400">Remove</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {adding && (
        <div className="mt-3 card p-3">
          <AddonForm
            operatorId={operatorId}
            addon={null}
            onDone={(c) => {
              setAdding(false);
              setItems((p) => [...p, c]);
              router.refresh();
            }}
            onCancel={() => setAdding(false)}
          />
        </div>
      )}
    </div>
  );
}

function AddonForm({ operatorId, addon, onDone, onCancel }: { operatorId: string; addon: any; onDone: (a: any) => void; onCancel: () => void }) {
  const [label, setLabel] = useState(addon?.label ?? '');
  const [type, setType] = useState(addon?.type ?? TYPES[0].value);
  const [price, setPrice] = useState(addon ? (addon.price_cents / 100).toFixed(2) : '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setErr(null);
    const sb = supabaseBrowser();
    const payload: any = {
      operator_id: operatorId,
      label,
      type,
      price_cents: Math.round(parseFloat(price) * 100),
      active: true,
    };
    const { data, error } = addon?.id
      ? await sb.from('operator_addons').update(payload).eq('id', addon.id).select().single()
      : await sb.from('operator_addons').insert(payload).select().single();
    setBusy(false);
    // Never hand a null row to onDone — pushing it into the list crashes the
    // whole page on the next render (reading .active on null).
    if (error || !data) {
      setErr(error?.message ?? 'Could not save the add-on — please try again.');
      return;
    }
    onDone(data);
  }

  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-12">
      <input className="field md:col-span-5" placeholder="Label" value={label} onChange={(e) => setLabel(e.target.value)} />
      <select className="field md:col-span-4" value={type} onChange={(e) => setType(e.target.value)}>
        {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>
      <input className="field md:col-span-2" type="number" step="0.01" placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} />
      {err && <div className="md:col-span-12 text-sm text-red-400">{err}</div>}
      <div className="md:col-span-12 flex gap-2">
        <button onClick={save} disabled={busy || !label || !price} className="btn-primary text-sm">{busy ? 'Saving…' : 'Save'}</button>
        <button onClick={onCancel} className="btn-quiet text-sm">Cancel</button>
      </div>
    </div>
  );
}
