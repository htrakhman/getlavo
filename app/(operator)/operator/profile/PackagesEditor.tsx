'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

type Pkg = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  est_minutes: number | null;
  active: boolean;
  display_order: number;
};

export function PackagesEditor({ operatorId, initial }: { operatorId: string; initial: Pkg[] }) {
  const router = useRouter();
  const [items, setItems] = useState<Pkg[]>(initial);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  async function remove(id: string) {
    const sb = supabaseBrowser();
    await sb.from('service_packages').update({ active: false }).eq('id', id);
    setItems((p) => p.filter((x) => x.id !== id));
    router.refresh();
  }

  const active = items.filter((p) => p.active);

  return (
    <div className="card p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-display text-xl">Service packages</h3>
          <p className="text-xs text-ink-500 mt-0.5">Residents choose from these when booking — think Fiverr gig tiers</p>
        </div>
        <button onClick={() => setAdding(true)} className="btn-quiet text-sm">+ Add package</button>
      </div>

      {active.length === 0 && !adding && (
        <div className="text-sm text-ink-400 py-2">
          No packages yet. Add one so residents can subscribe.
        </div>
      )}

      <div className="space-y-3">
        {active.map((pkg) => (
          <div key={pkg.id} className="card p-4">
            {editing === pkg.id ? (
              <PackageForm
                operatorId={operatorId}
                pkg={pkg}
                onDone={(updated) => {
                  setEditing(null);
                  setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
                  router.refresh();
                }}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-semibold text-white">{pkg.name}</span>
                    <span className="text-gleam font-medium">${(pkg.price_cents / 100).toFixed(0)}</span>
                    {pkg.est_minutes && (
                      <span className="text-xs text-ink-500">~{pkg.est_minutes} min</span>
                    )}
                  </div>
                  {pkg.description && (
                    <p className="mt-1.5 text-sm text-ink-400 leading-relaxed">{pkg.description}</p>
                  )}
                </div>
                <div className="flex gap-3 text-sm shrink-0">
                  <button onClick={() => setEditing(pkg.id)} className="text-gleam hover:text-gleam/70">Edit</button>
                  <button onClick={() => remove(pkg.id)} className="text-ink-500 hover:text-red-400">Remove</button>
                </div>
              </div>
            )}
          </div>
        ))}

        {adding && (
          <div className="card p-5">
            <PackageForm
              operatorId={operatorId}
              pkg={null}
              onDone={(created) => {
                setAdding(false);
                setItems((p) => [...p, created]);
                router.refresh();
              }}
              onCancel={() => setAdding(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function PackageForm({
  operatorId, pkg, onDone, onCancel,
}: {
  operatorId: string;
  pkg: Pkg | null;
  onDone: (p: Pkg) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(pkg?.name ?? '');
  const [description, setDescription] = useState(pkg?.description ?? '');
  const [price, setPrice] = useState(pkg ? (pkg.price_cents / 100).toFixed(2) : '');
  const [minutes, setMinutes] = useState(pkg?.est_minutes ? String(pkg.est_minutes) : '');
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const sb = supabaseBrowser();
    const payload = {
      operator_id: operatorId,
      name,
      description: description || null,
      price_cents: Math.round(parseFloat(price) * 100),
      est_minutes: minutes ? parseInt(minutes, 10) : null,
      active: true,
    };
    if (pkg?.id) {
      const { data } = await sb.from('service_packages').update(payload).eq('id', pkg.id).select().single();
      setBusy(false);
      onDone(data as Pkg);
    } else {
      const { data } = await sb.from('service_packages').insert(payload).select().single();
      setBusy(false);
      onDone(data as Pkg);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <label className="label">Package name</label>
          <input
            className="field"
            placeholder="e.g. Full Detail"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="label">Price (USD)</label>
          <input
            className="field"
            type="number"
            step="0.01"
            min="5"
            placeholder="e.g. 75"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
      </div>
      <div>
        <label className="label">What's included</label>
        <textarea
          className="field min-h-[80px] text-sm"
          placeholder="e.g. Hand wash exterior, interior vacuum, dashboard wipe, windows inside & out, air freshener"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div>
        <label className="label">Estimated time (minutes)</label>
        <input
          className="field w-32"
          type="number"
          min="5"
          placeholder="e.g. 60"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
        />
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={save} disabled={busy || !name || !price} className="btn-primary text-sm">
          {busy ? 'Saving…' : pkg ? 'Save changes' : 'Add package'}
        </button>
        <button onClick={onCancel} className="btn-quiet text-sm">Cancel</button>
      </div>
    </div>
  );
}
