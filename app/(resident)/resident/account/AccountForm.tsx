'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MAX_NOTIFICATION_EMAILS, isValidEmail } from '@/lib/notification-emails';

type Prefs = {
  email_reminder: boolean;
  email_complete: boolean;
};

export function AccountForm({ profile, residentId, prefs }: {
  profile: any;
  residentId: string | null;
  prefs: Prefs;
}) {
  const router = useRouter();
  const [name, setName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [extraEmails, setExtraEmails] = useState<string[]>(profile?.notification_emails ?? []);
  const [p, setP] = useState<Prefs>(prefs);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [resetStatus, setResetStatus] = useState<'idle' | 'sending' | 'sent' | string>('idle');

  async function save() {
    const cleaned = extraEmails.map((e) => e.trim()).filter(Boolean);
    const bad = cleaned.find((e) => !isValidEmail(e));
    if (bad) {
      setErr(`"${bad}" is not a valid email address`);
      return;
    }
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
        notificationEmails: cleaned,
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
            <label className="label">Phone</label>
            <input className="field" placeholder="+1 555 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <p className="mt-1 text-xs text-ink-500">So your operator can reach you about your car on wash day.</p>
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
          <Toggle label="Email me the day before my building's wash day" checked={p.email_reminder} onChange={() => toggle('email_reminder')} />
          <Toggle label="Email me when the operator finishes my car" checked={p.email_complete} onChange={() => toggle('email_complete')} />
          {/* Spelled out as rows rather than a sentence of fine print. These
              send either way, and "everything above" below has to mean a list
              someone can actually read down. */}
          <Toggle label="Email me when I book a wash" checked locked />
          <Toggle label="Email me when my wash is rescheduled" checked locked />
          <Toggle label="Email me when my wash is cancelled" checked locked />
          <Toggle label="Email me if there's a problem with my payment" checked locked />
          <p className="text-xs text-ink-500">
            Booking confirmations, schedule changes, cancellations and payment problems always send — those
            aren't optional. Each one carries a calendar invite and a link back into Lavo.
          </p>
        </div>

        <div className="mt-6 border-t border-white/5 pt-5">
          <h4 className="text-sm font-medium">Also email</h4>
          <p className="mt-1 text-xs text-ink-500">
            Copy up to {MAX_NOTIFICATION_EMAILS} more addresses on everything above — a partner who shares the car, or a
            second manager. They receive copies only; they can't sign in to this account.
          </p>
          <div className="mt-3 space-y-2">
            {extraEmails.map((email, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  className="field"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) =>
                    setExtraEmails((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))
                  }
                />
                <button
                  type="button"
                  onClick={() => setExtraEmails((prev) => prev.filter((_, idx) => idx !== i))}
                  aria-label={`Remove ${email || 'email'}`}
                  className="btn-quiet px-3 text-sm text-red-500"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          {extraEmails.length < MAX_NOTIFICATION_EMAILS && (
            <button
              type="button"
              onClick={() => setExtraEmails((prev) => [...prev, ''])}
              className="btn-quiet mt-3 text-sm"
            >
              + Add another email
            </button>
          )}
        </div>
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
          <button onClick={() => setConfirming(true)} className="btn-quiet text-sm text-red-500">Request account deletion</button>
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
            <button onClick={requestDelete} disabled={busy} className="btn-primary !bg-red-500 !text-[#fff] text-sm">Submit request</button>
            <button onClick={() => setConfirming(false)} className="btn-quiet text-sm">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * `locked` is an always-on notification: shown checked so the list reads as the
 * full set of what gets sent, but not switchable — the server ignores a
 * preference for these anyway (see prefRespects in lib/notify.ts), and a toggle
 * that silently doesn't take is worse than no toggle.
 */
function Toggle({
  label,
  checked,
  onChange,
  locked,
}: {
  label: string;
  checked: boolean;
  onChange?: () => void;
  locked?: boolean;
}) {
  const Row = locked ? 'div' : 'label';
  return (
    <Row
      className={`flex items-center justify-between rounded-lg border border-white/5 px-3 py-3 ${
        locked ? '' : 'cursor-pointer hover:bg-white/5'
      }`}
    >
      <span className="text-sm">{label}</span>
      <span className="flex items-center gap-2">
        {locked && <span className="text-xs text-ink-500">Always</span>}
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={locked}
          readOnly={locked}
          aria-label={locked ? `${label} (always on)` : undefined}
          className="h-4 w-4 accent-gleam"
        />
      </span>
    </Row>
  );
}
