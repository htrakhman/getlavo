'use client';

import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export function AccessEditor({
  residentId,
  method,
  notes,
}: {
  residentId: string;
  method: string | null;
  notes: string | null;
}) {
  const router = useRouter();
  const [m, setM] = useState(method ?? '');
  const [n, setN] = useState(notes ?? '');
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const sb = supabaseBrowser();
    await sb
      .from('residents')
      .update({
        vehicle_access_method: m || null,
        vehicle_access_notes: n || null,
      })
      .eq('id', residentId);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="card p-6 space-y-4">
      <h3 className="font-display text-xl">Vehicle access</h3>
      <div>
        <label className="label">How should the operator access your car?</label>
        <select className="field" value={m} onChange={(e) => setM(e.target.value)}>
          <option value="">Not set</option>
          <option value="guest_spot">Guest spot</option>
          <option value="lockbox">Lockbox</option>
          <option value="home">I will be home</option>
          <option value="doorman">Doorman has key</option>
          <option value="instructions">Custom instructions</option>
        </select>
      </div>
      <div>
        <label className="label">Details</label>
        <textarea className="field min-h-[88px]" value={n} onChange={(e) => setN(e.target.value)} placeholder="Codes, landmarks, anything the crew needs" />
      </div>
      <button type="button" disabled={busy} className="btn-primary text-sm" onClick={() => save()}>
        {busy ? 'Saving…' : 'Save access info'}
      </button>
    </div>
  );
}
