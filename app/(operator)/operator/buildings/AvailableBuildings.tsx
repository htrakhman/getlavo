'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Building = {
  id: string;
  name: string;
  address_line1: string | null;
  city: string | null;
  region: string | null;
  total_units: number | null;
  status: string;
};

export function AvailableBuildings({
  buildings,
  pendingByBuildingId,
}: {
  buildings: Building[];
  pendingByBuildingId: Record<string, string>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState<Record<string, string>>(pendingByBuildingId);

  async function requestMatch(buildingId: string) {
    setBusy(buildingId);
    setErr(null);
    const res = await fetch('/api/partnerships/request-from-operator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buildingId }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(j.error ?? 'Failed to send request');
      setBusy(null);
      return;
    }
    setSent((prev) => ({ ...prev, [buildingId]: j.partnershipId }));
    setBusy(null);
    router.refresh();
  }

  if (!buildings.length) {
    return (
      <div className="card p-8 text-center text-sm text-ink-400">
        No open buildings in your service area right now. Check back soon or contact Lavo to expand coverage.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {buildings.map((b) => {
        const pending = sent[b.id];
        return (
          <div key={b.id} className="card flex items-center justify-between gap-4 p-6">
            <div className="min-w-0">
              <div className="font-display text-xl">{b.name}</div>
              <div className="text-sm text-ink-400">
                {[b.address_line1, b.city, b.region].filter(Boolean).join(' · ')}
              </div>
              {b.total_units != null && (
                <div className="mt-1 text-xs text-ink-500">{b.total_units} units</div>
              )}
              <div className="mt-2">
                <span className="chip capitalize">{b.status}</span>
              </div>
            </div>
            <div className="shrink-0 text-right">
              {pending ? (
                <span className="chip text-amber-600">Request sent</span>
              ) : (
                <button
                  type="button"
                  onClick={() => requestMatch(b.id)}
                  disabled={busy === b.id}
                  className="btn-primary text-sm py-2 px-4"
                >
                  {busy === b.id ? 'Sending…' : 'Request to partner'}
                </button>
              )}
            </div>
          </div>
        );
      })}
      {err && <div className="text-sm text-red-400">{err}</div>}
    </div>
  );
}
