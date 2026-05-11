'use client';
import { Suspense } from 'react';
import { Logo } from '@/components/Logo';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

function LoginForm() {
  const params = useSearchParams();
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
    const { data: p, error: pe } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (pe) { setErr(`Profile error: ${pe.message}`); setBusy(false); return; }
    const dest = p?.role === 'building_manager' ? '/building'
               : p?.role === 'operator' ? '/operator'
               : '/resident/onboarding';
    window.location.href = dest;
  }

  async function signInWithGoogle() {
    const sb = supabaseBrowser();
    await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
      <Logo />
      <div className="mt-16">
        <h1 className="font-display text-4xl tracking-tight">Welcome back</h1>

        <button
          onClick={signInWithGoogle}
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium transition hover:bg-white/10"
        >
          <GoogleIcon />
          Continue with Google
        </button>

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
          New here? <a href="/signup" className="text-gleam">Create an account</a>
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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  );
}
