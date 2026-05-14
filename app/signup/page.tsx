'use client';
import { Suspense } from 'react';
import { Logo } from '@/components/Logo';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Turnstile } from '@/components/Turnstile';
import { defaultSignupRole, normalizeSignupRole, type SignupRole } from '@/lib/portal-routing';

const ROLES = [
  { id: 'building_manager', label: 'Property Manager', sub: 'I manage an apartment building, parking garage, or any property with a parking structure' },
  { id: 'resident', label: 'Resident', sub: 'My building uses Lavo' },
  { id: 'operator', label: 'Car Wash Operator', sub: 'I run a mobile crew' },
] as const;

function SignupForm() {
  const params = useSearchParams();
  const [role, setRole] = useState<SignupRole>(() => normalizeSignupRole(params.get('role')) ?? defaultSignupRole());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [captcha, setCaptcha] = useState<string | null>(null);

  useEffect(() => {
    const tokenFromUrl = params.get('invite');
    const tokenFromStorage = typeof window !== 'undefined' ? localStorage.getItem('lavo_invite_token') : null;
    const token = tokenFromUrl ?? tokenFromStorage;
    if (!token) return;
    setInviteToken(token);
    setRole('resident');
    fetch(`/api/building/invites/lookup?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.email) setEmail(d.email);
        if (d.fullName) setName(d.fullName);
      })
      .catch(() => {});
  }, [params]);

  useEffect(() => {
    const invite =
      params.get('invite') ??
      (typeof window !== 'undefined' ? localStorage.getItem('lavo_invite_token') : null);
    if (invite) return;
    const parsed = normalizeSignupRole(params.get('role'));
    if (parsed) setRole(parsed);
  }, [params]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null); setInfo(null);

    const ver = await fetch('/api/captcha/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: captcha }),
    });
    if (!ver.ok) { setErr('Please complete the verification.'); setBusy(false); return; }

    const sb = supabaseBrowser();
    const { data, error } = await sb.auth.signUp({
      email, password,
      options: { data: { full_name: name, role, invite_token: inviteToken } },
    });
    if (error) { setErr(error.message); setBusy(false); return; }

    if (inviteToken) {
      fetch('/api/building/invites/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: inviteToken }),
      }).catch(() => {});
      if (typeof window !== 'undefined') localStorage.removeItem('lavo_invite_token');
    }

    if (!data.session) {
      setBusy(false);
      setInfo('Check your email to confirm your address, then sign in. After you confirm, you will be sent to the right portal.');
      return;
    }

    const dest = role === 'building_manager' ? '/building/onboarding'
               : role === 'operator' ? '/operator/onboarding'
               : '/resident/onboarding';
    window.location.href = dest;
  }

  async function signUpWithGoogle() {
    setErr(null);
    setBusy(true);
    try {
      const intent = await fetch('/api/auth/oauth-signup-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (!intent.ok) {
        let msg = 'Could not start sign-up — try again.';
        try {
          const d = (await intent.json()) as { error?: string };
          if (typeof d.error === 'string') msg = d.error;
        } catch { /* ignore */ }
        setErr(msg);
        return;
      }
      const sb = supabaseBrowser();
      const { error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // Path-based callback so redirect allowlists cannot drop a query string; cookie + metadata are fallbacks.
          redirectTo: `${window.location.origin}/auth/callback/${encodeURIComponent(role)}`,
        },
      });
      if (error) setErr(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
      <Logo />
      <div className="mt-16">
        <h1 className="font-display text-4xl tracking-tight">Create your account</h1>
        <p className="mt-2 text-sm text-ink-300">Tell us who you are. You can always change this later.</p>

        <div className="mt-8 grid grid-cols-1 gap-3">
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

        <button
          type="button"
          onClick={signUpWithGoogle}
          disabled={busy}
          className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium transition hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <GoogleIcon />
          Continue with Google as {ROLES.find(r => r.id === role)?.label}
        </button>

        <div className="relative my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs text-ink-500">or sign up with email</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Full name</label>
            <input className="field" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="field" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Turnstile onToken={setCaptcha} />
          {info && <div className="text-sm text-emerald-400/90">{info}</div>}
          {err && <div className="text-sm text-red-400">{err}</div>}
          <button disabled={busy || !captcha} className="btn-primary w-full">{busy ? 'Creating…' : 'Create account'}</button>
        </form>

        <div className="mt-6 text-center text-sm text-ink-400">
          Already have an account? <a href="/login" className="text-gleam">Sign in</a>
        </div>
      </div>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
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
