'use client';
import { money } from '@/lib/format';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function PartnershipConnector({
  operatorId,
  buildingId,
  basePriceCents,
  openSlotPriceCents,
  existingStatus,
}: {
  operatorId: string;
  buildingId: string;
  basePriceCents: number;
  openSlotPriceCents: number | null;
  existingStatus: 'none' | 'pending' | 'active' | 'declined';
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function request() {
    setBusy(true); setErr(null);
    try {
      const res = await fetch('/api/partnerships/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buildingId, operatorId }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(j.error ?? 'Failed to send request'); return; }
      // Show success immediately — don't depend on the refreshed server
      // status query, which previously left the button stuck on "Sending…".
      setSent(true);
      router.refresh();
    } catch {
      setErr('Failed to send request — please try again.');
    } finally {
      setBusy(false);
    }
  }

  const status = sent && existingStatus !== 'active' ? 'pending' : existingStatus;

  return (
    <div className="card sticky top-6 h-fit p-6 space-y-4">
      <h3 className="font-display text-xl">Request a partnership</h3>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink-400">Building wash day</span>
          <span className="font-medium text-gleam">{money(basePriceCents)}</span>
        </div>
        {openSlotPriceCents && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-400">On-demand rate</span>
            <span className="font-medium">{money(openSlotPriceCents)}</span>
          </div>
        )}
      </div>

      {status === 'none' && (
        <>
          <p className="text-sm text-ink-400 leading-relaxed">
            Requesting a partnership sends an invite to this car wash. Once they accept, residents can sign up and book washes immediately.
          </p>
          {err && <div className="text-sm text-red-400">{err}</div>}
          <button onClick={request} disabled={busy} className="btn-primary w-full">
            {busy ? 'Sending…' : 'Request partnership'}
          </button>
        </>
      )}

      {status === 'pending' && (
        <div className="rounded-xl border border-yellow-400/30 bg-yellow-400/5 p-4 text-sm text-amber-700">
          Request sent. Waiting for the operator to accept.
        </div>
      )}

      {status === 'active' && (
        <div className="rounded-xl border border-gleam/30 bg-gleam/5 p-4 text-sm text-gleam">
          ✓ Active partnership — residents can book with this operator.
        </div>
      )}

      {status === 'declined' && !sent && (
        <>
          <div className="rounded-xl border border-red-400/30 bg-red-400/5 p-4 text-sm text-red-500">
            This operator declined your last request. You can send a new one.
          </div>
          {err && <div className="text-sm text-red-400">{err}</div>}
          <button onClick={request} disabled={busy} className="btn-ghost w-full">
            {busy ? 'Sending…' : 'Send another request'}
          </button>
        </>
      )}
    </div>
  );
}
