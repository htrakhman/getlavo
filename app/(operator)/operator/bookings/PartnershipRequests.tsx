'use client';
import { useState } from 'react';

type Request = {
  id: string;
  created_at: string;
  building: { name: string; city: string; address_line1: string } | null;
};

export function PartnershipRequests({ requests }: { requests: Request[] }) {
  const [local, setLocal] = useState(requests);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function respond(id: string, action: 'accept' | 'decline') {
    setBusy(id); setErr(null);
    const res = await fetch(`/api/partnerships/${id}/${action}`, { method: 'POST' });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error ?? 'Failed');
      setBusy(null);
      return;
    }
    setLocal((prev) => prev.filter((r) => r.id !== id));
    setBusy(null);
  }

  if (!local.length) return null;

  return (
    <div className="mb-8">
      <div className="mb-3 text-xs uppercase tracking-widest text-yellow-400">Partnership requests</div>
      <div className="space-y-3">
        {local.map((r) => (
          <div key={r.id} className="card border-yellow-400/20 bg-yellow-400/5 p-5 flex items-center justify-between gap-4">
            <div>
              <div className="font-medium">{r.building?.name ?? 'Unknown building'}</div>
              <div className="mt-0.5 text-sm text-ink-400">
                {r.building?.city} · {r.building?.address_line1}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => respond(r.id, 'accept')}
                disabled={busy === r.id}
                className="btn-primary text-sm py-2 px-4"
              >
                Accept
              </button>
              <button
                onClick={() => respond(r.id, 'decline')}
                disabled={busy === r.id}
                className="btn-quiet text-sm py-2 px-4"
              >
                Decline
              </button>
            </div>
          </div>
        ))}
      </div>
      {err && <div className="mt-2 text-sm text-red-400">{err}</div>}
    </div>
  );
}
