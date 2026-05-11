'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import type { ManagedBuilding } from '@/lib/building';

export function BuildingSwitcher({ current, all }: { current: ManagedBuilding | null; all: ManagedBuilding[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function pick(id: string) {
    if (id === current?.id) { setOpen(false); return; }
    setBusy(true);
    await fetch('/api/building/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buildingId: id }),
    });
    setBusy(false);
    setOpen(false);
    router.refresh();
  }

  if (all.length === 0) return null;

  return (
    <div className="relative mb-6">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-left hover:bg-white/10"
      >
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-ink-400">Building</div>
          <div className="truncate text-sm font-medium">{current?.name ?? 'Select…'}</div>
        </div>
        <span className="text-ink-400 text-xs">▾</span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-white/10 bg-ink-900 shadow-xl">
          {all.map((b) => (
            <button
              key={b.id}
              onClick={() => pick(b.id)}
              disabled={busy}
              className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-white/5 ${b.id === current?.id ? 'text-gleam' : ''}`}
            >
              <span className="truncate">{b.name}</span>
              {b.id === current?.id && <span className="text-xs">✓</span>}
            </button>
          ))}
          <Link
            href="/building/onboarding?add=1"
            onClick={() => setOpen(false)}
            className="block border-t border-white/10 px-3 py-2 text-sm text-ink-300 hover:bg-white/5"
          >
            + Add a building
          </Link>
        </div>
      )}
    </div>
  );
}
