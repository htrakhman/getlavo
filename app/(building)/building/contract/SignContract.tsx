'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

export function SignContract({ contractId, buildingName }: { contractId: string; buildingName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function sign() {
    setBusy(true);
    setErr(null);
    const sb = supabaseBrowser();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setErr('Not signed in'); setBusy(false); return; }

    const { error } = await sb.from('contracts').update({
      manager_signed_at: new Date().toISOString(),
      manager_signed_by: user.id,
      manager_signed_name: name,
    }).eq('id', contractId);

    setBusy(false);
    if (error) { setErr(error.message); return; }
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary mt-6">Sign this agreement</button>
    );
  }

  return (
    <div className="mt-6 card border-gleam/30 p-5">
      <h4 className="font-display text-lg">Sign agreement</h4>
      <div className="mt-4 space-y-3">
        <div>
          <label className="label">Full name</label>
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
          I confirm I am authorized to sign on behalf of {buildingName}
        </label>
        {err && <div className="text-sm text-red-400">{err}</div>}
        <div className="flex gap-2">
          <button onClick={sign} disabled={!name || !confirmed || busy} className="btn-primary text-sm">
            {busy ? 'Signing…' : 'Sign'}
          </button>
          <button onClick={() => setOpen(false)} className="btn-quiet text-sm">Cancel</button>
        </div>
      </div>
    </div>
  );
}
