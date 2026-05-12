'use client';
import { useState } from 'react';

const PORTALS = [
  { portal: 'building', label: 'Property Manager', dest: '/building' },
  { portal: 'operator', label: 'Car Wash Operator', dest: '/operator' },
  { portal: 'resident', label: 'Resident', dest: '/resident/washes' },
] as const;

// Shown in the sidebar when the user has multiple portals (e.g. a dev/admin account).
export function DevRoleSwitcher({ currentPortal }: { currentPortal: string }) {
  const [busy, setBusy] = useState(false);

  function switchTo(dest: string) {
    if (busy) return;
    setBusy(true);
    window.location.href = dest;
  }

  return (
    <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-yellow-400">
        Switch portal
      </div>
      <div className="flex flex-col gap-1">
        {PORTALS.map((p) => (
          <button
            key={p.portal}
            onClick={() => switchTo(p.dest)}
            disabled={busy || p.portal === currentPortal}
            className={`rounded-lg px-3 py-1.5 text-left text-xs transition ${
              p.portal === currentPortal
                ? 'bg-yellow-500/20 font-semibold text-yellow-300 cursor-default'
                : 'text-yellow-200/70 hover:bg-yellow-500/10 hover:text-yellow-200'
            }`}
          >
            {p.portal === currentPortal ? `✓ ${p.label}` : p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
