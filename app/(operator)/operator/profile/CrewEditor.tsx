'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

export function CrewEditor({ operatorId, initial }: { operatorId: string; initial: any[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [adding, setAdding] = useState(false);

  async function add(name: string, phone: string, email: string) {
    const sb = supabaseBrowser();
    const { data } = await sb.from('crew_members').insert({
      operator_id: operatorId,
      full_name: name,
      phone: phone || null,
      email: email || null,
    }).select().single();
    if (data) setItems((p) => [...p, data]);
    setAdding(false);
    router.refresh();
  }

  async function remove(id: string) {
    const sb = supabaseBrowser();
    await sb.from('crew_members').update({ active: false }).eq('id', id);
    setItems((p) => p.filter((x) => x.id !== id));
    router.refresh();
  }

  return (
    <div className="card p-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-xl">Crew members</h3>
        <button onClick={() => setAdding(true)} className="btn-quiet text-sm">+ Add member</button>
      </div>
      <p className="text-xs text-ink-500 mb-4">Track who's running each wash day. (Login access for crew is a future feature.)</p>

      <div className="space-y-2">
        {items.filter((x) => x.active !== false).map((c) => (
          <div key={c.id} className="card p-3 flex items-center justify-between">
            <div>
              <div className="text-sm">{c.full_name}</div>
              <div className="text-xs text-ink-500">{c.phone ?? c.email ?? '—'}</div>
            </div>
            <button onClick={() => remove(c.id)} className="text-xs text-ink-400 hover:text-red-400">Remove</button>
          </div>
        ))}
        {items.filter((x) => x.active !== false).length === 0 && !adding && (
          <p className="text-sm text-ink-400">No crew added yet.</p>
        )}
      </div>

      {adding && <CrewForm onCancel={() => setAdding(false)} onSave={add} />}
    </div>
  );
}

function CrewForm({ onCancel, onSave }: { onCancel: () => void; onSave: (n: string, p: string, e: string) => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  return (
    <div className="card mt-3 p-3">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        <input className="field text-sm" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="field text-sm" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <input className="field text-sm" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="mt-3 flex gap-2">
        <button onClick={() => onSave(name, phone, email)} disabled={!name} className="btn-primary text-sm">Save</button>
        <button onClick={onCancel} className="btn-quiet text-sm">Cancel</button>
      </div>
    </div>
  );
}
