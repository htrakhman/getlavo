'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

type Prefs = {
  email_reminder: boolean;
  sms_reminder: boolean;
  email_complete: boolean;
  sms_complete: boolean;
};

export function AccountForm({ profile, residentId, prefs }: {
  profile: any;
  residentId: string | null;
  prefs: Prefs;
}) {
  const router = useRouter();
  const [name, setName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [p, setP] = useState<Prefs>(prefs);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setErr(null);
    const sb = supabaseBrowser();
    const { error: pe } = await sb.from('profiles').update({ full_name: name, phone }).eq('id', profile.id);
    if (pe) { setErr(pe.message); setBusy(false); return; }
    if (residentId) {
      await sb.from('residents').update({ notification_preferences: p }).eq('id', residentId);
    }
    setBusy(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  async function changePassword() {
    const sb = supabaseBrowser();
    const { data: { user } } = await sb.auth.getUser();
    if (!user?.email) return;
    const { error } = await sb.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/resident/account`,
    });
    if (error) alert(error.message);
    else alert('Check your email for a password reset link.');
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
            <label className="label">Phone (for SMS reminders)</label>
            <input className="field" placeholder="+1 555 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <button onClick={changePassword} className="btn-quiet text-sm">Send password reset email</button>
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
