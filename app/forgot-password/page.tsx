'use client';
import { Logo } from '@/components/Logo';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useState } from 'react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const sb = supabaseBrowser();
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setDone(true);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
      <Logo />
      <div className="mt-16">
        <h1 className="font-display text-4xl tracking-tight">Reset your password</h1>
        <p className="mt-2 text-sm text-ink-300">We'll email you a link to choose a new one.</p>

        {done ? (
          <div className="mt-8 card border-gleam/30 p-5 text-sm">
            If an account exists for <strong>{email}</strong>, a reset link is on its way. Check your inbox.
          </div>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <label className="label">Email</label>
              <input className="field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {err && <div className="text-sm text-red-400">{err}</div>}
            <button disabled={busy} className="btn-primary w-full">{busy ? 'Sending…' : 'Send reset email'}</button>
          </form>
        )}

        <div className="mt-6 text-center text-sm text-ink-400">
          <a href="/login" className="text-gleam">Back to sign in</a>
        </div>
      </div>
    </main>
  );
}
