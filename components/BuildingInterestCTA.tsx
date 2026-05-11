'use client';

import { useState } from 'react';

export function BuildingInterestCTA() {
  const [building, setBuilding] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!building.trim()) return;
    setState('loading');
    try {
      const res = await fetch('/api/building-interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ building }),
      });
      setState(res.ok ? 'done' : 'error');
    } catch {
      setState('error');
    }
  }

  return (
    <section className="relative mx-auto max-w-6xl px-6 py-20">
      <div className="card p-10 text-center max-w-2xl mx-auto">
        <div className="text-xs uppercase tracking-[0.18em] text-gleam mb-3">For residents</div>
        <h2 className="font-display text-3xl font-semibold tracking-tight leading-tight mb-3">
          Want Lavo at your building?
        </h2>
        <p className="text-ink-300 text-sm mb-8">
          Tell us where you live and we'll take it from there.
        </p>

        {state === 'done' ? (
          <p className="text-gleam text-sm font-medium py-4">
            Got it — we'll reach out to your building management shortly.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
              placeholder="Enter your building or complex name"
              className="flex-1 rounded-lg border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-ink-400 outline-none focus:border-gleam/60 focus:ring-1 focus:ring-gleam/30 transition-colors"
              disabled={state === 'loading'}
              required
            />
            <button
              type="submit"
              disabled={state === 'loading' || !building.trim()}
              className="btn-primary whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {state === 'loading' ? 'Sending…' : 'Get my building on board'}
            </button>
          </form>
        )}

        {state === 'error' && (
          <p className="mt-3 text-xs text-red-400">Something went wrong — please try again.</p>
        )}
      </div>
    </section>
  );
}
