'use client';
import { Logo } from '@/components/Logo';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const ROLES = [
  { id: 'building_manager', label: 'Property Manager', sub: 'I manage an apartment building, parking garage, or any property with a parking structure' },
  { id: 'resident', label: 'Resident', sub: 'My building uses Lavo' },
  { id: 'operator', label: 'Car Wash Operator', sub: 'I run a mobile crew' },
] as const;

type RoleId = typeof ROLES[number]['id'];

export default function PickRolePage() {
  const router = useRouter();
  const [role, setRole] = useState<RoleId>('building_manager');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    supabaseBrowser().auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/login'); return; }
      const name =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split('@')[0] ||
        '';
      setUserName(name);
    });
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const sb = supabaseBrowser();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setErr('Session expired — please sign in again'); setBusy(false); return; }

    const fullName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split('@')[0] ||
      '';

    const portalKind = role === 'building_manager' ? 'building'
                     : role === 'operator' ? 'operator'
                     : 'resident';

    const { error } = await sb.from('profiles').upsert({
      id: user.id,
      role,
      full_name: fullName,
      email: user.email!,
    });

    if (error) { setErr(error.message); setBusy(false); return; }

    const { error: portalError } = await sb.from('profile_portals').upsert({ profile_id: user.id, portal: portalKind });
    if (portalError) { setErr(portalError.message); setBusy(false); return; }

    const dest = role === 'building_manager' ? '/building/onboarding'
               : role === 'operator' ? '/operator/onboarding'
               : '/resident/onboarding';
    window.location.href = dest;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
      <Logo />
      <div className="mt-16">
        <h1 className="font-display text-4xl tracking-tight">
          {userName ? `Welcome, ${userName.split(' ')[0]}!` : 'Welcome!'}
        </h1>
        <p className="mt-2 text-sm text-ink-300">One last step — tell us how you use Lavo.</p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <div className="grid grid-cols-1 gap-3">
            {ROLES.map((r) => (
              <button
                key={r.id}
                onClick={() => setRole(r.id)}
                type="button"
                className={`card p-4 text-left transition hover:border-gleam/30 ${role === r.id ? 'border-gleam/60 shadow-glow' : ''}`}
              >
                <div className="font-display text-lg">{r.label}</div>
                <div className="text-xs text-ink-400">{r.sub}</div>
              </button>
            ))}
          </div>

          {err && <div className="text-sm text-red-400">{err}</div>}
          <button disabled={busy} className="btn-primary w-full">
            {busy ? 'Setting up…' : 'Continue'}
          </button>
        </form>
      </div>
    </main>
  );
}
