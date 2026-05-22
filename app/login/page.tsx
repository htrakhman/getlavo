'use client';
import { Suspense } from 'react';
import { Logo } from '@/components/Logo';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { supabaseBrowser } from '@/lib/supabase/client';
import { pickLandingPortal, signupHrefFromPortalPrefer, signupRoleFromPortalPrefer } from '@/lib/portal-routing';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

function LoginForm() {
  const params = useSearchParams();

  useEffect(() => {
    const ref = params.get('ref');
    const promo = params.get('promo');
    if (typeof window === 'undefined') return;
    if (ref) localStorage.setItem('lavo_referral_code', ref);
    if (promo) localStorage.setItem('lavo_promo_code', promo);
  }, [params]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(params.get('error') ? 'Sign-in failed — please try again.' : null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const sb = supabaseBrowser();
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) { setErr(error.message); setBusy(false); return; }
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setErr('No session — try again'); setBusy(false); return; }
    const [{ data: p, error: pe }, { data: portalRows }] = await Promise.all([
      sb.from('profiles').select('role').eq('id', user.id).maybeSingle(),
      sb.from('profile_portals').select('portal').eq('profile_id', user.id),
    ]);
    if (pe) { setErr(`Profile error: ${pe.message}`); setBusy(false); return; }
    const nextRaw = params.get('next');
    if (nextRaw === '/resident' || nextRaw === '/building' || nextRaw === '/operator') {
      setBusy(false);
      window.location.href = `/auth/continue?next=${encodeURIComponent(nextRaw)}`;
      return;
    }
    const portals = (portalRows ?? []).map((r: { portal: string }) => r.portal);
    const prefer = signupRoleFromPortalPrefer(params.get('prefer'));
    const landing = pickLandingPortal(portals, prefer ?? p?.role ?? undefined);
    const dest = landing === 'building' ? '/building'
               : landing === 'operator' ? '/operator'
               : landing === 'resident' ? '/resident'
               : p?.role === 'admin' ? '/admin'
               : '/auth/pick-role';
    window.location.href = dest;
  }

  const nextPath = params.get('next');

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
      <Logo />
      <div className="mt-16">
        <h1 className="font-display text-4xl tracking-tight">Welcome back</h1>

        <div className="mt-8">
          <GoogleSignInButton
            nextPath={nextPath}
            onError={(m) => setErr(m)}
            onBusyChange={setBusy}
            className="w-full overflow-hidden rounded-xl border border-white/10 bg-white/5"
          />
        </div>

        <div className="relative my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs text-ink-500">or</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div><label className="label">Email</label><input className="field" type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} /></div>
          <div><label className="label">Password</label><input className="field" type="password" required value={password} onChange={(e)=>setPassword(e.target.value)} /></div>
          {err && <div className="text-sm text-red-400">{err}</div>}
          <button disabled={busy} className="btn-primary w-full">{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>

        <div className="mt-4 text-center text-xs">
          <a href="/forgot-password" className="text-ink-400 hover:text-gleam">Forgot your password?</a>
        </div>

        <div className="mt-6 text-center text-sm text-ink-400">
          New here?{' '}
          <a href={signupHrefFromPortalPrefer(params.get('prefer'))} className="text-gleam">
            Create an account
          </a>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

