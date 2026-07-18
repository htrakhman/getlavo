'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Prefs = {
  email_reminder: boolean;
  sms_reminder: boolean;
  email_complete: boolean;
  sms_complete: boolean;
};

type SubState = {
  stripeSubscriptionId: string | null;
  tier: string | null;
  state: string;
};

export function AccountForm({ profile, residentId, subscription, prefs }: {
  profile: any;
  residentId: string | null;
  subscription?: SubState;
  prefs: Prefs;
}) {
  const router = useRouter();
  const [name, setName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [p, setP] = useState<Prefs>(prefs);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [subBusy, setSubBusy] = useState<string | null>(null);
  const [resetStatus, setResetStatus] = useState<'idle' | 'sending' | 'sent' | string>('idle');

  async function save() {
    setBusy(true);
    setErr(null);
    // Saved through a server route: direct browser writes are RLS-scoped and
    // were silently matching zero rows, losing edits with no error shown.
    const res = await fetch('/api/account/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: name,
        phone: phone || null,
        notificationPreferences: residentId ? p : undefined,
      }),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      const j = await res?.json().catch(() => null);
      setErr(typeof j?.error === 'string' ? j.error : 'Could not save — please try again');
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  async function changePassword() {
    setResetStatus('sending');
    // Server route: the browser-client reset silently no-oped when the
    // client-side auth session was unavailable, and alert() dialogs are
    // hostile to automation — inline status instead.
    const res = await fetch('/api/account/password-reset', { method: 'POST' }).catch(() => null);
    if (!res?.ok) {
      const j = await res?.json().catch(() => null);
      setResetStatus(typeof j?.error === 'string' ? j.error : 'Could not send reset email — please try again');
      return;
    }
    setResetStatus('sent');
  }

  function toggle(k: keyof Prefs) {
    setP((prev) => ({ ...prev, [k]: !prev[k] }));
  }

  async function startSubscription(tier: 'lite' | 'plus') {
    setSubBusy(tier);
    setErr(null);
    const res = await fetch('/api/stripe/subscription-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier }),
    });
    const j = await res.json().catch(() => ({}));
    setSubBusy(null);
    if (!res.ok) {
      setErr(typeof j.error === 'string' ? j.error : 'Could not start checkout');
      return;
    }
    if (j.checkoutUrl) window.location.href = j.checkoutUrl;
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 max-w-4xl">
      <div className="card p-6">
        <h3 className="font-display text-lg mb-4">Profile</h3>
        <div className="space-y-3">
          <div>
            <label className="label">Full name</label>
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="field opacity-60" value={profile?.email ?? ''} disabled />
            <p className="mt-1 text-xs text-ink-500">Contact support to change your email.</p>
          </div>
          <div>
            <label className="label">Phone (for SMS reminders)</label>
            <input className="field" placeholder="+1 555 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <button onClick={changePassword} disabled={resetStatus === 'sending'} className="btn-quiet text-sm">
            {resetStatus === 'sending' ? 'Sending…' : 'Send password reset email'}
          </button>
          {resetStatus === 'sent' && (
            <p className="text-xs text-gleam">Check your email for a password reset link.</p>
          )}
          {resetStatus !== 'idle' && resetStatus !== 'sending' && resetStatus !== 'sent' && (
            <p className="text-xs text-red-400">{resetStatus}</p>
          )}
        </div>
      </div>

      <div className="card p-6">
        <h3 className="font-display text-lg mb-4">Notifications</h3>
        <div className="space-y-3">
          <Toggle label="Email me wash reminders" checked={p.email_reminder} onChange={() => toggle('email_reminder')} />
          <Toggle label="Text me wash reminders" checked={p.sms_reminder} onChange={() => toggle('sms_reminder')} disabled={!phone} />
          <Toggle label="Email me when my car is done" checked={p.email_complete} onChange={() => toggle('email_complete')} />
          <Toggle label="Text me when my car is done" checked={p.sms_complete} onChange={() => toggle('sms_complete')} disabled={!phone} />
          {!phone && <p className="text-xs text-ink-500">Add a phone number to enable SMS.</p>}
        </div>
      </div>

      <div className="card p-6 lg:col-span-2">
        <h3 className="font-display text-lg mb-2">Lavo membership</h3>
        <p className="text-sm text-ink-400 mb-4">
          Optional add-on for residents who wash often. Unlock priority booking and member pricing.
        </p>
        {subscription?.stripeSubscriptionId ? (
          <p className="text-sm text-ink-200">
            Active subscription ({subscription.tier ?? 'plan'}) · status {subscription.state}
          </p>
        ) : (
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={!!subBusy || !residentId}
              onClick={() => startSubscription('lite')}
              className="btn-ghost text-sm"
            >
              {subBusy === 'lite' ? 'Redirecting…' : 'Subscribe — Lite'}
            </button>
            <button
              type="button"
              disabled={!!subBusy || !residentId}
              onClick={() => startSubscription('plus')}
              className="btn-primary text-sm"
            >
              {subBusy === 'plus' ? 'Redirecting…' : 'Subscribe — Plus'}
            </button>
          </div>
        )}
      </div>

      <div className="lg:col-span-2 flex items-center gap-3">
        <button onClick={save} disabled={busy} className="btn-primary">
          {busy ? 'Saving…' : saved ? 'Saved' : 'Save changes'}
        </button>
        {err && <span className="text-sm text-red-400">{err}</span>}
      </div>

      <div className="lg:col-span-2">
        <DataPanel />
      </div>
    </div>
  );
}

function DataPanel() {
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [requested, setRequested] = useState(false);

  async function requestDelete() {
    setBusy(true);
    await fetch('/api/account/delete-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    setBusy(false);
    setConfirming(false);
    setRequested(true);
  }

  return (
    <div className="card p-6">
      <h3 className="font-display text-lg mb-2">Your data</h3>
      <div className="flex flex-wrap gap-3">
        <a href="/api/account/export" className="btn-quiet text-sm">Download a copy</a>
        {!confirming && !requested && (
          <button onClick={() => setConfirming(true)} className="btn-quiet text-sm text-red-300">Request account deletion</button>
        )}
      </div>
      {requested && (
        <p className="mt-3 text-xs text-gleam">
          Request received. We'll email you when your account has been deleted (typically within 7 days).
        </p>
      )}
      {confirming && !requested && (
        <div className="mt-4 card border-red-500/30 p-4">
          <p className="text-sm">Tell us briefly why you're leaving (optional). We'll process the request manually within 7 days.</p>
          <input className="field mt-2" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional" />
          <div className="mt-3 flex gap-2">
            <button onClick={requestDelete} disabled={busy} className="btn-primary !bg-red-500 !text-white text-sm">Submit request</button>
            <button onClick={() => setConfirming(false)} className="btn-quiet text-sm">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Toggle({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <label className={`flex cursor-pointer items-center justify-between rounded-lg border border-white/5 px-3 py-3 ${disabled ? 'opacity-50' : 'hover:bg-white/5'}`}>
      <span className="text-sm">{label}</span>
      <input type="checkbox" disabled={disabled} checked={checked} onChange={onChange} className="h-4 w-4 accent-gleam" />
    </label>
  );
}
