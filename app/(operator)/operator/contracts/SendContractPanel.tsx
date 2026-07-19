'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Building = {
  id: string;
  name: string;
  address_line1: string | null;
  city: string | null;
  region: string | null;
  total_units: number | null;
  preferred_wash_day?: string | null;
};

export function SendContractPanel({ buildings }: { buildings: Building[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [err, setErr] = useState<string | null>(null);

  async function sendContract(buildingId: string) {
    setBusy(buildingId);
    setErr(null);
    const res = await fetch('/api/contracts/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buildingId }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setErr(j.error ?? 'Failed to send agreement');
      return;
    }
    setSent((prev) => ({ ...prev, [buildingId]: true }));
    router.refresh();
  }

  if (!buildings.length) {
    return (
      <div className="card p-8 text-center text-sm text-ink-400">
        No open buildings in your service area right now. Check back soon.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {buildings.map((b) => (
        <div key={b.id} className="card flex items-center justify-between gap-4 p-5">
          <div className="min-w-0">
            <div className="font-medium text-white">{b.name}</div>
            <div className="text-xs text-ink-400">
              {[b.address_line1, b.city, b.region].filter(Boolean).join(' · ')}
              {b.total_units != null && ` · ${b.total_units} units`}
            </div>
            {b.preferred_wash_day && (
              <div className="mt-1 text-xs text-ink-500">Prefers {b.preferred_wash_day}</div>
            )}
          </div>
          <div className="shrink-0">
            {sent[b.id] ? (
              <span className="chip text-gleam">Agreement sent</span>
            ) : (
              <button
                type="button"
                onClick={() => sendContract(b.id)}
                disabled={busy === b.id}
                className="btn-primary text-sm py-2 px-4"
              >
                {busy === b.id ? 'Sending…' : 'Send agreement'}
              </button>
            )}
          </div>
        </div>
      ))}
      {err && <div className="text-sm text-red-400">{err}</div>}
    </div>
  );
}
