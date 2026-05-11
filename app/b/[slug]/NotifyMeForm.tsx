'use client';
import { useState } from 'react';

export function NotifyMeForm({ buildingId }: { buildingId: string }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/building-interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buildingId, email }),
      });
      if (!res.ok) throw new Error('Could not save');
      setDone(true);
    } catch (e: any) {
      setErr(e.message ?? 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return <p className="mt-4 text-sm text-gleam">Thanks — we'll let you know.</p>;
  }

  return (
    <form onSubmit={submit} className="mt-5 flex flex-col gap-3 sm:flex-row">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@email.com"
        className="field flex-1"
      />
      <button disabled={busy} className="btn-primary">
        {busy ? '…' : 'Notify me'}
      </button>
      {err && <p className="text-sm text-red-400">{err}</p>}
    </form>
  );
}
