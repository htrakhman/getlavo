'use client';
import { Logo } from '@/components/Logo';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useState } from 'react';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { setErr('Use at least 8 characters.'); return; }
    if (password !== confirm) { setErr('Passwords don\'t match.'); return; }
    setBusy(true);
    setErr(null);
    const sb = supabaseBrowser();
    const { error } = await sb.auth.updateUser({ password });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setDone(true);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
      <Logo />
      <div className="mt-16">
        <h1 className="font-display text-4xl tracking-tight">Set a new password</h1>
        {done ? (
          <div className="mt-8 card border-gleam/30 p-5 text-sm">
            Password updated. <a href="/login" className="text-gleam">Sign in</a>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <label className="label">New password</label>
              <input className="field" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div>
              <label className="label">Confirm</label>
              <input className="field" type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            {err && <div className="text-sm text-red-400">{err}</div>}
            <button disabled={busy} className="btn-primary w-full">{busy ? 'Updating…' : 'Update password'}</button>
          </form>
        )}
      </div>
    </main>
  );
}
