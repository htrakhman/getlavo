'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function SkipButton({ washDayId, skipped, scheduledFor }: { washDayId: string; skipped: boolean; scheduledFor: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const hoursUntil = (new Date(scheduledFor).getTime() - Date.now()) / 3600000;
  const canUndo = hoursUntil > 12;

  async function skip() {
    setBusy(true);
    await fetch('/api/skips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ washDayId }),
    });
    setBusy(false);
    setConfirming(false);
    router.refresh();
  }

  async function undo() {
    setBusy(true);
    await fetch(`/api/skips/${washDayId}`, { method: 'DELETE' });
    setBusy(false);
    router.refresh();
  }

  if (skipped) {
    return (
      <div className="flex items-center gap-3">
        <span className="chip">Skipped</span>
        {canUndo && (
          <button onClick={undo} disabled={busy} className="text-xs text-gleam">
            Undo
          </button>
        )}
      </div>
    );
  }

  if (confirming) {
    return (
      <div className="space-y-2">
        <div className="text-sm text-ink-300">Skip this wash? You can undo until 12 hours before.</div>
        <div className="flex gap-2">
          <button onClick={skip} disabled={busy} className="btn-primary text-sm">Confirm skip</button>
          <button onClick={() => setConfirming(false)} className="btn-quiet text-sm">Cancel</button>
        </div>
      </div>
    );
  }

  return <button onClick={() => setConfirming(true)} className="btn-quiet text-sm">Skip this wash</button>;
}
