'use client';
import { useState } from 'react';

/**
 * Shown to a signed-in resident who scanned the QR code of a building other
 * than the one on their account. Confirms before re-attaching them.
 */
export function SwitchBuildingConfirm({
  slug,
  buildingName,
  currentBuildingName,
}: {
  slug: string;
  buildingName: string;
  currentBuildingName: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const scheduleUrl = `/schedule?b=${encodeURIComponent(slug)}`;

  async function confirmSwitch() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/residents/attach-building', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error ?? 'Something went wrong — please try again.');
        setBusy(false);
        return;
      }
      if (data.needsOnboarding) {
        window.location.href = `/resident/onboarding?b=${encodeURIComponent(slug)}&redirect=${encodeURIComponent(scheduleUrl)}`;
        return;
      }
      window.location.href = scheduleUrl;
    } catch {
      setErr('Something went wrong — please try again.');
      setBusy(false);
    }
  }

  return (
    <div className="card p-6">
      <h2 className="font-display text-xl">Book at {buildingName}?</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-300">
        {currentBuildingName
          ? `Your account is currently set to ${currentBuildingName}. Switch to ${buildingName} to book here.`
          : `Confirm ${buildingName} as your building to book here.`}
      </p>
      {err && <p className="mt-3 text-sm text-red-400">{err}</p>}
      <div className="mt-5 flex flex-col gap-3">
        <button onClick={confirmSwitch} disabled={busy} className="btn-primary w-full py-3">
          {busy ? 'Switching…' : `Yes — switch to ${buildingName}`}
        </button>
        <a href="/resident" className="btn-ghost w-full py-3 text-center">
          Keep my current building
        </a>
      </div>
    </div>
  );
}
