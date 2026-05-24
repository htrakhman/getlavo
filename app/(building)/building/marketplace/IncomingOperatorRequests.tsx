'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Request = {
  id: string;
  created_at: string;
  operator: {
    name: string;
    description: string | null;
    rating_avg: number | null;
    rating_count: number;
  } | null;
};

export function IncomingOperatorRequests({ requests }: { requests: Request[] }) {
  const router = useRouter();
  const [local, setLocal] = useState(requests);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function respond(id: string, action: 'accept' | 'decline') {
    setBusy(id);
    setErr(null);
    const res = await fetch(`/api/partnerships/${id}/${action}`, { method: 'POST' });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error ?? 'Failed');
      setBusy(null);
      return;
    }
    setLocal((prev) => prev.filter((r) => r.id !== id));
    setBusy(null);
    router.refresh();
  }

  if (!local.length) return null;

  return (
    <div className="mb-8">
      <div className="mb-3 text-xs uppercase tracking-widest text-gleam">Operator requests</div>
      <div className="space-y-3">
        {local.map((r) => (
          <div
            key={r.id}
            className="card border-gleam/20 bg-gleam/5 p-5 flex items-center justify-between gap-4"
          >
            <div>
              <div className="font-medium">{r.operator?.name ?? 'Car wash operator'}</div>
              {r.operator?.rating_count ? (
                <div className="mt-0.5 text-xs text-ink-400">
                  ★ {Number(r.operator.rating_avg).toFixed(1)} · {r.operator.rating_count} reviews
                </div>
              ) : null}
              {r.operator?.description && (
                <p className="mt-2 text-sm text-ink-400 line-clamp-2">{r.operator.description}</p>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => respond(r.id, 'accept')}
                disabled={busy === r.id}
                className="btn-primary text-sm py-2 px-4"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={() => respond(r.id, 'decline')}
                disabled={busy === r.id}
                className="btn-quiet text-sm py-2 px-4"
              >
                Decline
              </button>
            </div>
          </div>
        ))}
      </div>
      {err && <div className="mt-2 text-sm text-red-400">{err}</div>}
    </div>
  );
}
