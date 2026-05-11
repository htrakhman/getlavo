'use client';
import { useRouter } from 'next/navigation';
import { useState, useRef } from 'react';

const FLAG_REASONS = [
  'Car not in spot',
  'Unable to access vehicle area',
  'Damage found — stopping wash',
  'Other',
];

export function CrewTool({
  washDayId,
  buildingName,
  scheduledFor,
  startedAt,
  completedAt,
  floors,
  skipped,
}: {
  washDayId: string;
  buildingName: string;
  scheduledFor: string;
  startedAt: string | null;
  completedAt: string | null;
  floors: [string, any[]][];
  skipped: any[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [flagFor, setFlagFor] = useState<string | null>(null);
  const [photoFor, setPhotoFor] = useState<string | null>(null);
  const [wrappingUp, setWrappingUp] = useState(false);

  async function start(washId: string) {
    setBusyId(washId);
    await fetch(`/api/wash-records/${washId}/start`, { method: 'POST' });
    setBusyId(null);
    router.refresh();
  }

  async function done(washId: string, photoFile: File | null) {
    setBusyId(washId);
    if (photoFile) {
      const fd = new FormData();
      fd.append('photo', photoFile);
      await fetch(`/api/wash-records/${washId}/photo`, { method: 'POST', body: fd });
    }
    await fetch(`/api/wash-records/${washId}/complete`, { method: 'POST' });
    setBusyId(null);
    setPhotoFor(null);
    router.refresh();
  }

  async function flag(washId: string, reason: string, notes: string) {
    setBusyId(washId);
    await fetch(`/api/wash-records/${washId}/flag`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, notes }),
    });
    setBusyId(null);
    setFlagFor(null);
    router.refresh();
  }

  async function wrapUp() {
    setWrappingUp(true);
    await fetch(`/api/wash-days/${washDayId}/complete`, { method: 'POST' });
    setWrappingUp(false);
    router.refresh();
  }

  const allItems = floors.flatMap(([, items]) => items);
  const total = allItems.length;
  const completed = allItems.filter((w) => w.status === 'completed').length;
  const remaining = allItems.filter((w) => w.status !== 'completed' && w.status !== 'flagged').length;
  const allDone = total > 0 && remaining === 0;

  // Average time per completed wash (rolling, capped at 60 min) — used to estimate remaining
  const completedWithTimes = allItems.filter((w) => w.status === 'completed' && w.completed_at && startedAt);
  const avgMin = completedWithTimes.length > 0 && startedAt
    ? Math.min(60, Math.max(5, Math.round(((Date.now() - new Date(startedAt).getTime()) / 60000) / Math.max(1, completedWithTimes.length))))
    : 15;
  const etaMin = remaining * avgMin;

  const dateStr = new Date(scheduledFor + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-ink-950">
      {/* Sticky header */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-ink-900/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate font-display text-lg">{buildingName}</div>
            <div className="text-xs text-ink-400">{dateStr}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-ink-400">
              {completed} of {total}
              {remaining > 0 && startedAt && !completedAt && (
                <span className="ml-1">· ~{etaMin} min left</span>
              )}
            </div>
            {completedAt ? (
              <span className="chip text-gleam">completed</span>
            ) : startedAt ? (
              <span className="chip">in progress</span>
            ) : (
              <button onClick={() => fetch(`/api/wash-days/${washDayId}/start`, { method: 'POST' }).then(() => router.refresh())} className="btn-primary !py-1 !px-2 !text-xs">Start day</button>
            )}
          </div>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
          <div className="h-full bg-gleam transition-all" style={{ width: `${total ? (completed / total) * 100 : 0}%` }} />
        </div>
      </header>

      <main className="px-4 py-4 pb-32">
        {floors.map(([label, items]) => {
          const floorDone = items.length > 0 && items.every((w: any) => w.status === 'completed' || w.status === 'flagged');
          const floorCount = items.filter((w: any) => w.status === 'completed').length;
          return (
          <section key={label} className="mb-6">
            <h2 className={`mb-2 flex items-center gap-2 text-xs uppercase tracking-widest ${floorDone ? 'text-gleam' : 'text-ink-400'}`}>
              {floorDone && <span>✓</span>}
              <span>{label} · {floorCount}/{items.length}</span>
            </h2>
            <div className="space-y-3">
              {items
                .sort((a, b) => (a.spot_label ?? '').localeCompare(b.spot_label ?? ''))
                .map((w) => (
                  <VehicleCard
                    key={w.id}
                    w={w}
                    busy={busyId === w.id}
                    onStart={() => start(w.id)}
                    onDone={() => setPhotoFor(w.id)}
                    onFlag={() => setFlagFor(w.id)}
                  />
                ))}
            </div>
          </section>
        );})}

        {skipped.length > 0 && (
          <details className="mt-8">
            <summary className="cursor-pointer text-xs uppercase tracking-widest text-ink-400">
              Skipped ({skipped.length})
            </summary>
            <div className="mt-3 space-y-2">
              {skipped.map((w) => (
                <div key={w.id} className="card p-3 text-sm text-ink-400">
                  Spot {w.spot_label ?? '—'} · {w.vehicle?.year} {w.vehicle?.make} {w.vehicle?.model}
                </div>
              ))}
            </div>
          </details>
        )}
      </main>

      {/* Wrap up footer */}
      {!completedAt && allDone && (
        <footer className="fixed inset-x-0 bottom-0 border-t border-white/5 bg-ink-900/95 px-4 py-3 backdrop-blur">
          <button onClick={wrapUp} disabled={wrappingUp} className="btn-primary w-full">
            {wrappingUp ? 'Wrapping up…' : 'Wrap up wash day'}
          </button>
        </footer>
      )}

      {/* Photo capture overlay */}
      {photoFor && (
        <PhotoCapture
          washId={photoFor}
          onCancel={() => setPhotoFor(null)}
          onSubmit={(f) => done(photoFor, f)}
        />
      )}

      {/* Flag bottom sheet */}
      {flagFor && (
        <FlagSheet
          washId={flagFor}
          onCancel={() => setFlagFor(null)}
          onSubmit={(reason, notes) => flag(flagFor, reason, notes)}
        />
      )}
    </div>
  );
}

function VehicleCard({ w, busy, onStart, onDone, onFlag }: { w: any; busy: boolean; onStart: () => void; onDone: () => void; onFlag: () => void }) {
  const status = w.status as string;

  if (status === 'completed') {
    return (
      <div className="card border-gleam/20 p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="font-medium">Spot {w.spot_label ?? '—'}</div>
            <div className="text-xs text-ink-400">{w.vehicle?.year} {w.vehicle?.make} {w.vehicle?.model}</div>
          </div>
          <span className="chip text-gleam">✓ done</span>
        </div>
        {w.photo_url && <img src={w.photo_url} className="mt-3 h-20 w-20 rounded-lg object-cover" alt="" />}
      </div>
    );
  }

  if (status === 'flagged') {
    return (
      <div className="card border-amber-400/20 p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="font-medium">Spot {w.spot_label ?? '—'}</div>
            <div className="text-xs text-amber-300">⚑ {w.flag_reason}</div>
          </div>
          <span className="chip text-amber-300">flagged</span>
        </div>
      </div>
    );
  }

  const inProgress = status === 'in_progress';

  return (
    <div className="card p-4">
      <div>
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${inProgress ? 'bg-gleam animate-pulse' : 'bg-ink-500'}`} />
          <div className="font-medium">Spot {w.spot_label ?? '—'}</div>
          {w.resident?.floor_number != null && (
            <div className="text-xs text-ink-500">Floor {w.resident.floor_number}</div>
          )}
        </div>
        <div className="mt-1 text-sm text-ink-200">
          {w.vehicle?.year} {w.vehicle?.make} {w.vehicle?.model} · {w.vehicle?.color}
        </div>
        <div className="mt-1 text-xs font-mono text-ink-400">{w.vehicle?.license_plate}</div>
        {w.resident?.package?.name && (
          <div className="mt-1 text-xs text-ink-300">Package: {w.resident.package.name}</div>
        )}
        {w.addon_orders?.length > 0 && (
          <div className="mt-1 text-xs text-ink-300">
            Add-ons: {w.addon_orders.map((a: any) => a.operator_addon?.label).filter(Boolean).join(', ')}
          </div>
        )}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {!inProgress ? (
          <button disabled={busy} onClick={onStart} className="btn-primary !py-2 !text-sm">START</button>
        ) : (
          <span className="chip text-center">IN PROGRESS</span>
        )}
        <button disabled={busy || !inProgress} onClick={onDone} className="btn-primary !py-2 !text-sm">DONE</button>
        <button disabled={busy} onClick={onFlag} className="btn-quiet !py-2 !text-sm">FLAG</button>
      </div>
    </div>
  );
}

function PhotoCapture({ washId, onCancel, onSubmit }: { washId: string; onCancel: () => void; onSubmit: (f: File | null) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl bg-ink-900 p-6 sm:rounded-2xl">
        <h3 className="font-display text-xl">Photo</h3>
        <p className="mt-1 text-sm text-ink-400">Take a photo of the cleaned vehicle.</p>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mt-4 block w-full text-sm text-ink-300"
        />

        {file && (
          <div className="mt-3 text-xs text-ink-400">{file.name} · {(file.size / 1024).toFixed(0)} KB</div>
        )}

        <div className="mt-6 flex gap-2">
          <button onClick={() => onSubmit(file)} disabled={!file} className="btn-primary flex-1">
            Submit & complete
          </button>
          <button onClick={() => onSubmit(null)} className="btn-quiet flex-1">Skip photo</button>
        </div>
        <button onClick={onCancel} className="mt-2 w-full text-xs text-ink-400">Cancel</button>
      </div>
    </div>
  );
}

function FlagSheet({ washId, onCancel, onSubmit }: { washId: string; onCancel: () => void; onSubmit: (reason: string, notes: string) => void }) {
  const [reason, setReason] = useState(FLAG_REASONS[0]);
  const [notes, setNotes] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl bg-ink-900 p-6 sm:rounded-2xl">
        <h3 className="font-display text-xl">Flag this vehicle</h3>
        <p className="mt-1 text-sm text-ink-400">No charge will be created for this vehicle.</p>

        <div className="mt-4 space-y-2">
          {FLAG_REASONS.map((r) => (
            <button
              key={r}
              onClick={() => setReason(r)}
              className={`w-full rounded-lg border px-4 py-3 text-left text-sm ${reason === r ? 'border-gleam text-gleam' : 'border-white/10 text-ink-200'}`}
            >
              {r}
            </button>
          ))}
        </div>

        <textarea
          className="field mt-4"
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="mt-6 flex gap-2">
          <button onClick={() => onSubmit(reason, notes)} className="btn-primary flex-1">Flag vehicle</button>
          <button onClick={onCancel} className="btn-quiet flex-1">Cancel</button>
        </div>
      </div>
    </div>
  );
}
