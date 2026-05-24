'use client';

import { useState } from 'react';

export type BuildingPendingOperatorPanelProps = {
  buildingCandidateKey: string;
  buildingId: string;
  buildingName: string;
  formattedAddress?: string | null;
  placeId?: string | null;
  requestCount?: number;
};

export function BuildingPendingOperatorPanel({
  buildingCandidateKey,
  buildingId,
  buildingName,
  formattedAddress,
  placeId,
  requestCount = 0,
}: BuildingPendingOperatorPanelProps) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    setErr(null);
    if (!email.trim().includes('@')) {
      setErr('Please enter a valid email.');
      return;
    }

    setBusy(true);
    try {
      const res = await fetch('/api/building-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buildingCandidateKey,
          buildingId,
          email: email.trim(),
          buildingName,
          formattedAddress,
          placeId,
          source: 'check_flow',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(typeof data.error === 'string' ? data.error : 'Could not save. Try again.');
        return;
      }
      setDone(true);
    } catch {
      setErr('Network error. Try again.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-4">
        <h3 className="font-display text-2xl">You&apos;re on the list.</h3>
        <p className="text-sm text-ink-300 leading-relaxed">
          We&apos;ll email you at <span className="text-ink-100">{email.trim()}</span> as soon as{' '}
          {buildingName} is matched with a car wash operator and booking opens.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs uppercase tracking-widest text-gleam">Found on Lavo</div>
        <h3 className="mt-2 font-display text-2xl">{buildingName}</h3>
        {formattedAddress && <p className="mt-1 text-sm text-ink-400">{formattedAddress}</p>}
      </div>

      <p className="text-sm text-ink-300 leading-relaxed">
        Your building is on our platform, but we haven&apos;t matched a car wash operator yet. We&apos;re working on
        it — leave your email and we&apos;ll notify you as soon as residents can book.
      </p>

      {requestCount > 0 && (
        <p className="text-sm text-ink-400">
          <span className="text-gleam">
            {requestCount} {requestCount === 1 ? 'neighbor is' : 'neighbors are'} already waiting for Lavo here.
          </span>
        </p>
      )}

      <div className="space-y-3">
        <label className="block space-y-1.5">
          <span className="text-sm text-ink-200">Your email</span>
          <input
            className="field w-full"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button type="button" className="btn-primary w-full py-3 text-sm" disabled={busy} onClick={() => submit()}>
          {busy ? 'Saving…' : 'Notify me when booking opens'}
        </button>
      </div>
    </div>
  );
}
