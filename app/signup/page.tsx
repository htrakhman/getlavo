'use client';
import { Suspense } from 'react';
import { Logo } from '@/components/Logo';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { supabaseBrowser } from '@/lib/supabase/client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Turnstile } from '@/components/Turnstile';
import { homePathForSignupRole, normalizeSignupRole, type SignupRole } from '@/lib/portal-routing';

const ROLES = [
  {
    id: 'building_manager' as const,
    label: 'Property Manager',
    sub: 'I manage a building or parking structure that offers Lavo',
  },
  {
    id: 'resident' as const,
    label: 'Resident',
    sub: 'My building uses Lavo and I want to book washes',
  },
  {
    id: 'operator' as const,
    label: 'Car wash operator',
    sub: 'I run a mobile crew and wash for Lavo buildings',
  },
];

function SignupForm() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [role, setRole] = useState<SignupRole | null>(() => normalizeSignupRole(params.get('role')));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [captcha, setCaptcha] = useState<string | null>(null);

  const inviteLocked = Boolean(inviteToken);

  const syncRoleInUrl = useCallback(
    (next: SignupRole) => {
      if (inviteLocked) return;
      const sp = new URLSearchParams(params.toString());
      sp.set('role', next);
      router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
    },
    [inviteLocked, params, pathname, router]
  );

  const chooseRole = useCallback(
    (r: SignupRole) => {
      if (inviteLocked) return;
      setRole(r);
      syncRoleInUrl(r);
    },
    [inviteLocked, syncRoleInUrl]
  );

  useEffect(() => {
    const b = params.get('building');
    if (b && typeof window !== 'undefined') {
      localStorage.setItem('lavo_building_slug', b);
    }
  }, [params]);

  useEffect(() => {
    const ref = params.get('ref');
    const promo = params.get('promo');
    if (typeof window === 'undefined') return;
    if (ref) localStorage.setItem('lavo_referral_code', ref);
    if (promo) localStorage.setItem('lavo_promo_code', promo);
  }, [params]);

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
    if (!role) {
      setErr('Choose the type of account you are creating.');
      return;
    }
    setBusy(true);
    setErr(null);
    setInfo(null);

    const ver = await fetch('/api/captcha/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: captcha }),
    });
    if (!ver.ok) {
      setErr('Please complete the verification.');
      setBusy(false);
      return;
    }

    const sb = supabaseBrowser();
    const confirmUrl = new URL('/auth/confirm', window.location.origin);
    confirmUrl.searchParams.set('role', role);
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name, role, invite_token: inviteToken },
        emailRedirectTo: confirmUrl.toString(),
      },
    });
    if (error) {
      setErr(error.message);
      setBusy(false);
      return;
    }
    // Supabase returns an empty identities array when the email is already registered
    // (instead of an error) to avoid leaking whether an address exists.
    if (data.user && data.user.identities?.length === 0) {
      setBusy(false);
      setErr('An account with that email already exists. Sign in instead.');
      return;
    }

    const refCode = typeof window !== 'undefined' ? localStorage.getItem('lavo_referral_code') : null;
    if (refCode && data.session) {
      const r = await fetch('/api/referrals/attribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: refCode }),
      }).catch(() => null);
      if (r?.ok && typeof window !== 'undefined') localStorage.removeItem('lavo_referral_code');
    }

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
      setInfo('Check your email to confirm your address, then sign in. You will land in the portal that matches the account type you chose.');
      return;
    }

    await sb.auth.getSession();
    setBusy(false);
    const home = homePathForSignupRole(role);
    window.location.assign(`/auth/continue?next=${encodeURIComponent(home)}`);
  }

  const roleLabel = role ? ROLES.find((r) => r.id === role)?.label : null;

  return (
    <main className="relative mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
      <Logo />
      <div className="mt-16">
        <h1 className="font-display text-4xl tracking-tight">Create your account</h1>
        <p className="mt-2 text-sm text-ink-300">
          {inviteLocked
            ? 'You are signing up with a building invite as a resident.'
            : 'Pick the account type that matches how you use Lavo. Each type has its own dashboard.'}
        </p>

        <div className="mt-8 grid grid-cols-1 gap-3">
          {ROLES.map((r) => (
            <button
              key={r.id}
              onClick={() => chooseRole(r.id)}
              type="button"
              disabled={inviteLocked && r.id !== 'resident'}
              className={`card p-4 text-left transition hover:border-gleam/30 disabled:cursor-not-allowed disabled:opacity-40 ${role === r.id ? 'border-gleam/60 shadow-glow' : ''}`}
            >
              <div className="font-display text-lg">{r.label}</div>
              <div className="text-xs text-ink-400">{r.sub}</div>
            </button>
          ))}
        </div>

        {!inviteLocked && !role && (
          <p className="mt-3 text-xs text-ink-500">Select one of the options above to continue with Google or email.</p>
        )}

        <div className="mt-6">
          <GoogleSignInButton
            signupRole={role}
            disabled={busy || !role}
            onError={(m) => setErr(m)}
            onBusyChange={setBusy}
            className="w-full overflow-hidden rounded-xl border border-white/10 bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
          />
          {roleLabel && (
            <p className="mt-2 text-center text-xs text-ink-500">Signing up as {roleLabel}</p>
          )}
        </div>

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
            <input
              className="field"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Turnstile onToken={setCaptcha} />
          {info && <div className="text-sm text-emerald-400/90">{info}</div>}
          {err && (
            <div className="text-sm text-red-400">
              {err}{' '}
              {err.includes('already exists') && (
                <a href={`/login?${email ? `next=%2Fresident` : ''}`} className="underline text-gleam">Sign in</a>
              )}
            </div>
          )}
          <button disabled={busy || !captcha || !role} className="btn-primary w-full">
            {busy ? 'Creating…' : 'Create account'}
          </button>
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
