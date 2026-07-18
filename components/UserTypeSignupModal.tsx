'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { homePathForSignupRole, type SignupRole } from '@/lib/portal-routing';
import { Turnstile } from '@/components/Turnstile';

const USER_TYPES = [
  {
    id: 'building_manager' as const,
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21V11h6v10" />
      </svg>
    ),
    label: 'I manage a property',
    sub: 'Offer Lavo as a free amenity to your residents',
    accent: '#22d3ee',
  },
  {
    id: 'resident' as const,
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
    label: "I'm a resident",
    sub: 'Book a car wash right at your building',
    accent: '#a78bfa',
  },
  {
    id: 'operator' as const,
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M3 17a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v5Z" />
        <path d="M16 10V7a4 4 0 0 0-8 0v3" />
        <circle cx="12" cy="15" r="1" />
      </svg>
    ),
    label: 'I run a wash crew',
    sub: 'Get booked at buildings in your area',
    accent: '#34d399',
  },
] as const;

export function UserTypeSignupCTA() {
  const [selected, setSelected] = useState<SignupRole | null>(null);

  return (
    <>
      <div className="mt-16">
        {/* Label with side lines */}
        <div className="flex items-center gap-5 mb-10">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/15" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/40">Get started</span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/15" />
        </div>

        <div className="mx-auto flex max-w-3xl flex-col gap-4 sm:flex-row sm:justify-center">
          {USER_TYPES.map((ut) => (
            <button
              key={ut.id}
              type="button"
              onClick={() => setSelected(ut.id)}
              className="group relative w-full sm:flex-1 rounded-3xl p-px text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98]"
              style={{
                background: `linear-gradient(145deg, ${ut.accent}40 0%, ${ut.accent}08 50%, transparent 100%)`,
              }}
            >
              {/* Inner card */}
              <span className="flex flex-col h-full rounded-[23px] bg-[#0b0f16] p-7 transition-colors duration-200 group-hover:bg-[#0f1520]">
                <span
                  className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{ color: ut.accent, background: `${ut.accent}18` }}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    {ut.id === 'building_manager' && <><path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21V11h6v10" /></>}
                    {ut.id === 'resident' && <><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></>}
                    {ut.id === 'operator' && <><path d="M3 17a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v5Z" /><path d="M16 10V7a4 4 0 0 0-8 0v3" /><circle cx="12" cy="15" r="1" /></>}
                  </svg>
                </span>
                <span className="block font-bold text-white text-xl leading-snug">{ut.label}</span>
                <span className="mt-2 block text-[14px] text-white/50 leading-relaxed">{ut.sub}</span>
                <span
                  className="mt-6 flex items-center gap-2 text-[13px] font-semibold transition-all duration-150"
                  style={{ color: ut.accent }}
                >
                  Sign up
                  <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="transition-transform duration-150 group-hover:translate-x-1">
                    <path d="M2 6h8M7 3l3 3-3 3" />
                  </svg>
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <SignupModal role={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}

function SignupModal({ role, onClose }: { role: SignupRole; onClose: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const ut = USER_TYPES.find((u) => u.id === role)!;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => { if (e.target === overlayRef.current) onClose(); },
    [onClose],
  );

  async function signUpWithGoogle() {
    setBusy(true);
    setErr(null);
    try {
      const intent = await fetch('/api/auth/oauth-signup-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (!intent.ok) {
        setErr('Could not start sign-up — try again.');
        return;
      }
      const sb = supabaseBrowser();
      const { error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback?role=${encodeURIComponent(role)}` },
      });
      if (error) setErr(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
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
        data: { full_name: name, role },
        emailRedirectTo: confirmUrl.toString(),
      },
    });
    if (error) { setErr(error.message); setBusy(false); return; }
    if (data.user && data.user.identities?.length === 0) {
      setBusy(false);
      setErr('An account with that email already exists. Sign in instead.');
      return;
    }
    if (!data.session) {
      setBusy(false);
      setInfo('Check your email to confirm your address, then sign in.');
      return;
    }
    await sb.auth.getSession();
    fetch('/api/auth/notify-signup', { method: 'POST', keepalive: true }).catch(() => {});
    setBusy(false);
    window.location.assign(`/auth/continue?next=${encodeURIComponent(homePathForSignupRole(role))}`);
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border border-white/10 bg-[#0e1117] shadow-2xl overflow-hidden"
        style={{ maxHeight: '92dvh', overflowY: 'auto' }}
      >
        {/* Colour accent strip */}
        <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${ut.accent}80, ${ut.accent}20)` }} />

        <div className="px-6 pt-6 pb-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <span
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{ color: ut.accent, background: `${ut.accent}18` }}
              >
                {ut.icon}
              </span>
              <div>
                <div className="text-xs text-ink-500 uppercase tracking-widest">Signing up as</div>
                <div className="font-display text-lg leading-tight">{ut.label}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-ink-400 hover:text-ink-100 transition-colors"
              aria-label="Close"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M1 1l12 12M13 1L1 13" />
              </svg>
            </button>
          </div>

          {/* Google */}
          <button
            type="button"
            onClick={signUpWithGoogle}
            disabled={busy}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium transition hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <div className="relative my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-ink-500">or</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          {/* Email form */}
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
            {info && <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-400">{info}</div>}
            {err && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
                {err}{' '}
                {err.includes('already exists') && (
                  <a href="/login" className="underline text-gleam">Sign in</a>
                )}
              </div>
            )}
            <button
              disabled={busy || !captcha}
              className="btn-primary w-full py-3"
              style={!busy && captcha ? { background: `linear-gradient(135deg, ${ut.accent}cc, ${ut.accent}80)`, color: '#000', fontWeight: 600 } : {}}
            >
              {busy ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-ink-500">
            Already have an account?{' '}
            <a href="/login" className="text-gleam hover:underline">Sign in</a>
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335" />
    </svg>
  );
}
