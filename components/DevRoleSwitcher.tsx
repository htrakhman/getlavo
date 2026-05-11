'use client';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useState } from 'react';

const ROLES = [
  { id: 'building_manager', label: 'Manager', dest: '/building' },
  { id: 'operator', label: 'Operator', dest: '/operator' },
  { id: 'resident', label: 'Resident', dest: '/resident/onboarding' },
] as const;

// Only rendered when NEXT_PUBLIC_DEV_ROLE_SWITCHER=true — lets you use one
// Google account to preview all three portals without creating separate accounts.
export function DevRoleSwitcher({ currentRole }: { currentRole: string }) {
  const [busy, setBusy] = useState(false);

  async function switchTo(role: string, dest: string) {
    if (role === currentRole || busy) return;
    setBusy(true);
    const sb = supabaseBrowser();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    await sb.from('profiles').update({ role }).eq('id', user.id);
    window.location.href = dest;
  }

  return (
    <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-yellow-400">
        Dev · Switch role
      </div>
      <div className="flex flex-col gap-1">
        {ROLES.map((r) => (
          <button
            key={r.id}
            onClick={() => switchTo(r.id, r.dest)}
            disabled={busy || r.id === currentRole}
            className={`rounded-lg px-3 py-1.5 text-left text-xs transition ${
              r.id === currentRole
                ? 'bg-yellow-500/20 font-semibold text-yellow-300 cursor-default'
                : 'text-yellow-200/70 hover:bg-yellow-500/10 hover:text-yellow-200'
            }`}
          >
            {r.id === currentRole ? `✓ ${r.label}` : r.label}
          </button>
        ))}
      </div>
    </div>
  );
}
