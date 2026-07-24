'use client';

import { useState } from 'react';

interface StatusResponse {
  connected: boolean;
  onboarded: boolean;
  missing?: string[];
  disabledReason?: string | null;
  dashboardUrl?: string | null;
  error?: string;
}

export function StripeConnectSection({ initialConnected }: { initialConnected: boolean }) {
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<StatusResponse | null>(null);

  async function openDashboard() {
    setBusy(true);
    try {
      const res = await fetch('/api/stripe/connect/status');
      const data: StatusResponse = await res.json().catch(() => ({ connected: false, onboarded: false }));

      // Fully onboarded → straight to the Stripe Express dashboard.
      if (data.onboarded && data.dashboardUrl) {
        window.location.assign(data.dashboardUrl);
        return;
      }
      // Otherwise show what still needs finishing, in plain language.
      setModal(data);
    } catch {
      setModal({ connected: true, onboarded: false, error: 'Could not reach Stripe. Please try again.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-xl">Stripe Connect</h3>
        {initialConnected ? (
          <span className="chip text-gleam">Connected</span>
        ) : (
          <a href="/api/stripe/connect/onboard" className="btn-primary text-sm">
            Connect bank account →
          </a>
        )}
      </div>

      {!initialConnected ? (
        <p className="text-sm text-ink-400">
          Connect your bank account to receive payouts from resident bookings.
        </p>
      ) : (
        <div className="space-y-2 text-sm text-ink-300">
          <button
            type="button"
            onClick={openDashboard}
            disabled={busy}
            className="text-gleam hover:underline disabled:opacity-50"
          >
            {busy ? 'Checking…' : 'Open Stripe dashboard →'}
          </button>
          <p className="text-xs text-ink-500">Payouts, account details, tax forms (1099-K) — all live there.</p>
        </div>
      )}

      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setModal(null)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-md flex-col overflow-y-auto rounded-2xl border border-white/10 bg-ink-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="font-display text-lg text-white">Finish your Stripe setup</h4>

            {modal.error ? (
              <p className="mt-3 text-sm text-ink-300">{modal.error}</p>
            ) : (
              <>
                <p className="mt-2 text-sm text-ink-300">
                  Stripe still needs a few things before your payouts and dashboard turn on:
                </p>
                {modal.missing && modal.missing.length > 0 ? (
                  <ul className="mt-4 space-y-2">
                    {modal.missing.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-ink-200">
                        <span className="mt-0.5 text-amber-500">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-ink-300">
                    Your Stripe onboarding isn&rsquo;t complete yet. Continue on Stripe to finish the
                    remaining steps.
                  </p>
                )}
                <p className="mt-4 rounded-lg bg-white/5 px-3 py-2 text-xs text-ink-400">
                  You don&rsquo;t enter these here — click <span className="text-ink-200">Finish setup on Stripe</span> and
                  Stripe&rsquo;s secure page walks you through each one. You&rsquo;ll come back to Lavo automatically when done.
                </p>
              </>
            )}

            <div className="mt-6 flex gap-2">
              <a href="/api/stripe/connect/onboard" className="btn-primary text-sm">
                Finish setup on Stripe →
              </a>
              <button onClick={() => setModal(null)} className="btn-quiet text-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
